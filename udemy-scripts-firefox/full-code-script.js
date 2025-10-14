// ==UserScript==
// @name         Udemy Subtitle Extractor (Chrome + Firefox)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Capture Udemy subtitle (.vtt) files and send them to localhost server
// @match        *://*.udemy.com/course/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @inject-into  page
// ==/UserScript==

(function () {
  "use strict";

  const SERVER_URL = "http://localhost:3000/save-subtitles";

  console.log("[Udemy Subtitle Extractor] Script loaded");

  // Confirm context
  console.log(
    "[Udemy Subtitle Extractor] Context:",
    window === unsafeWindow ? "sandbox" : "page"
  );

  // Variables
  const parentHeadingQuery = 'h1[data-purpose="course-header-title"]';
  const videoLengthQuery = 'span[data-purpose="duration"]';
  const timestampQuery = 'span[data-purpose="current-time"]';
  const captionsQuery = 'div[data-purpose="captions-cue-text"]';

  const liElQuery = 'li[aria-current="true"]';
  const liSpanElQuery = 'span[data-purpose="item-title"]';
  let count = 0;

  /** -------------------------------
   *  Utils
   * ------------------------------- */
  async function waitAndRun(fn, delay = 3000) {
    await new Promise((resolve) => setTimeout(resolve, delay)); // ⏳ wait
    return fn(); // ✅ run the function after delay
  }

  function slugifyTitle(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // 2️⃣ remove special characters (keep letters, numbers, space, and "-")
      .replace(/\s+/g, "-"); // 3️⃣ replace spaces with "-"
  }

  function getParentTitle() {
    const titleEl = document.querySelector(parentHeadingQuery);

    const courseTitle = titleEl ? titleEl.textContent.trim() : null;

    return slugifyTitle(courseTitle);
  }

  async function getCurrentLength() {
    return await waitAndRun(() => {
      return document.querySelector(videoLengthQuery)?.textContent || "unknown";
    }, 2000);
  }

  function getCurrentTitle() {
    // Select the <li> with aria-current="true"
    const liEl = document.querySelector(liElQuery);

    // From inside that <li>, find the span[data-purpose="item-title"]
    const spanEl = liEl ? liEl.querySelector(liSpanElQuery) : null;

    // Get its text
    const text = spanEl ? spanEl.textContent.trim() : null;

    return slugifyTitle(text);
  }

  function getTimestamp() {
    return document.querySelector(timestampQuery)?.innerText || "unknown";
  }

  function getCaptions() {
    return document.querySelector(captionsQuery)?.innerText || "";
  }

  function getSectionName() {
    // Find the active <li>
    const activeLi = document.querySelector(liElQuery);

    if (activeLi) {
      // Get the nearest wrapper <div> of this li
      const wrapperDiv = activeLi.closest("div");

      if (wrapperDiv) {
        // Find the previous sibling <div> (the one containing <h3>)
        const sectionDiv = wrapperDiv.parentElement?.previousElementSibling;

        if (sectionDiv) {
          const heading = sectionDiv.querySelector("h3");
          if (heading) {
            return slugifyTitle(heading.textContent.trim());
          }
        }
      }
    }
  }
  /** -------------------------------
   *  Utils END
   * ------------------------------- */

  // Helper: send subtitle to local server
  function sendToServer(data) {
    console.log(data);
    GM_xmlhttpRequest({
      method: "POST",
      url: SERVER_URL,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(data),
      onload: (res) =>
        console.log(
          "✅ Subtitle sent to server:",
          res.status,
          res.statusText || ""
        ),
      onerror: (err) =>
        console.error("❌ Failed to send subtitle to server:", err),
    });
  }

  // Helper: get metadata (optional)
  function getCourseInfo() {
    const title = document.title.replace(" | Udemy", "").trim();
    const section =
      document
        .querySelector(".section--section-title--8blTh")
        ?.textContent?.trim() || "Unknown Section";
    return { title, section };
  }

  // --- Hook Fetch API ---
  (function hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes(".vtt")) {
        console.log("🎯 [fetch] Captured subtitle:", url);
        try {
          const text = await response.clone().text();
          const info = getCourseInfo();
          const videoLength = await getCurrentLength();

          sendToServer({
            url: this._url,
            content: text,
            videoLength: videoLength,
            title: getCurrentTitle(),
            parentTitle: getParentTitle(),
            sectionName: getSectionName(),
            rootDirectory: "udemy",
          });
        } catch (err) {
          console.error("❌ Error reading fetched subtitle:", err);
        }
      }

      return response;
    };
  })();

  // --- Hook XHR (for older subtitle loaders) ---
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
            const info = getCourseInfo();

            const videoLength = await getCurrentLength();

            sendToServer({
              url: this._url,
              content: text,
              videoLength: videoLength,
              title: getCurrentTitle(),
              parentTitle: getParentTitle(),
              sectionName: getSectionName(),
              rootDirectory: "udemy",
            });
          } catch (err) {
            console.error("❌ Error reading XHR subtitle:", err);
          }
        }
      });
      return origSend.apply(this, args);
    };
  })();

  console.log("[Udemy Subtitle Extractor] Hooks installed");
})();
