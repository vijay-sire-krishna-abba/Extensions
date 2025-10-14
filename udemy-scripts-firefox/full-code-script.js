// ==UserScript==
// @name         Udemy Subtitle Extractor (Chrome + Firefox)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Capture Udemy subtitle (.vtt) files and send them to localhost server
// @match        *://*.udemy.com/course/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @inject-into  page
// ==/UserScript==

(function () {
  "use strict";

  /**************************************************************
   * CONFIGURATION
   **************************************************************/
  const SERVER_URL = "http://localhost:3000/save-subtitles";
  const ROOT_DIRECTORY = "udemy";

  console.log("[Udemy Subtitle Extractor] ✅ Script initialized");

  /**************************************************************
   * DOM SELECTORS
   **************************************************************/
  const SELECTORS = {
    parentHeading: 'h1[data-purpose="course-header-title"]',
    videoLength: 'span[data-purpose="duration"]',
    timestamp: 'span[data-purpose="current-time"]',
    captions: 'div[data-purpose="captions-cue-text"]',
    activeLesson: 'li[aria-current="true"]',
    lessonTitle: 'span[data-purpose="item-title"]',
  };

  /**************************************************************
   * UTILITIES
   **************************************************************/

  /** Pause before running a function */
  async function waitAndRun(fn, delay = 3000) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fn();
  }

  /** Convert text into a safe filename slug */
  function slugify(text) {
    return text
      ? text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
      : "unknown";
  }

  /** Get top-level course title */
  function getParentTitle() {
    const titleEl = document.querySelector(SELECTORS.parentHeading);
    return slugify(titleEl?.textContent || "unknown-course");
  }

  /** Get currently playing video title */
  function getCurrentTitle() {
    const li = document.querySelector(SELECTORS.activeLesson);
    const span = li?.querySelector(SELECTORS.lessonTitle);
    return slugify(span?.textContent || "unknown-video");
  }

  /** Get current section name */
  function getSectionName() {
    const activeLi = document.querySelector(SELECTORS.activeLesson);
    if (!activeLi) return "unknown-section";
    const wrapperDiv = activeLi.closest("div");
    const sectionDiv = wrapperDiv?.parentElement?.previousElementSibling;
    const heading = sectionDiv?.querySelector("h3");
    return slugify(heading?.textContent || "unknown-section");
  }

  /** Get full video length */
  async function getVideoLength() {
    return await waitAndRun(() => {
      return (
        document.querySelector(SELECTORS.videoLength)?.textContent || "unknown"
      );
    }, 2000);
  }

  /** Get current timestamp (playhead) */
  function getTimestamp() {
    return document.querySelector(SELECTORS.timestamp)?.innerText || "unknown";
  }

  /** Get current caption text (on-screen subtitle) */
  function getCaptions() {
    return document.querySelector(SELECTORS.captions)?.innerText || "";
  }

  /**************************************************************
   * NETWORK HELPERS
   **************************************************************/

  /** Send captured subtitle to local server */
  function sendToServer(data) {
    console.log("[Udemy Subtitle Extractor] 📤 Sending to server:", data.url);
    GM_xmlhttpRequest({
      method: "POST",
      url: SERVER_URL,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(data),
      onload: (res) =>
        console.log("✅ Server response:", res.status, res.statusText),
      onerror: (err) => console.error("❌ Network error:", err),
    });
  }

  /** Build structured payload for server */
  async function buildPayload({ url, content, source }) {
    return {
      url,
      content,
      source,
      title: getCurrentTitle(),
      parentTitle: getParentTitle(),
      sectionName: getSectionName(),
      videoLength: await getVideoLength(),
      timestamp: getTimestamp(),
      captions: getCaptions(),
      rootDirectory: ROOT_DIRECTORY,
      capturedAt: new Date().toISOString(),
    };
  }

  /**************************************************************
   * FETCH HOOK
   **************************************************************/
  (function hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes(".vtt")) {
        console.log("🎯 [Fetch] Captured subtitle:", url);
        try {
          const text = await response.clone().text();
          const payload = await buildPayload({
            url,
            content: text,
            source: "fetch",
          });
          sendToServer(payload);
        } catch (err) {
          console.error("❌ [Fetch] Failed to process subtitle:", err);
        }
      }

      return response;
    };
  })();

  /**************************************************************
   * XHR HOOK
   **************************************************************/
  (function hookXHR() {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      this._url = args[1];
      return origOpen.apply(this, args);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", async function () {
        if (this._url && this._url.includes(".vtt")) {
          console.log("🎯 [XHR] Captured subtitle:", this._url);
          try {
            const text = this.responseText;
            const payload = await buildPayload({
              url: this._url,
              content: text,
              source: "xhr",
            });
            sendToServer(payload);
          } catch (err) {
            console.error("❌ [XHR] Failed to process subtitle:", err);
          }
        }
      });
      return origSend.apply(this, args);
    };
  })();

  /**************************************************************
   * FINALIZE
   **************************************************************/
  console.log("[Udemy Subtitle Extractor] Hooks installed successfully");
})();
