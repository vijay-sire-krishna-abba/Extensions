(function () {
  "use strict";

  console.log("📥 Udemy Subtitle Extractor LOADED");

  /** ========================================
   * CONFIGURATION
   * ======================================== */
  const SERVER_URL = "http://localhost:3000/";

  // DOM Selectors
  const SELECTORS = {
    parentHeading: 'h1[data-purpose="course-header-title"]',
    videoLength: 'span[data-purpose="duration"]',
    liActive: 'li[aria-current="true"]',
    liTitleSpan: 'span[data-purpose="item-title"]',
  };

  // Debug toggle — set to false to silence logs
  const DEBUG = true;

  const log = (...args) => DEBUG && console.log(...args);
  const error = (...args) => DEBUG && console.error(...args);

  /** ========================================
   * SERVER API HANDLER
   * ======================================== */
  const ServerAPI = {
    async post(endpoint, data) {
      log(`🌐 [POST] → ${endpoint}`, data);
      try {
        const res = await fetch(`${SERVER_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const txt = await res.text();
        log(`✅ [${endpoint}] Response:`, txt);
      } catch (err) {
        error(`❌ [${endpoint}] Error:`, err);
      }
    },
  };

  /** ========================================
   * UTILITIES
   * ======================================== */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const slugify = (text) =>
    text
      ?.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") || "unknown";

  function getCourseTitle() {
    const el = document.querySelector(SELECTORS.parentHeading);
    const title = el?.textContent?.trim();
    log("📘 Course Title:", title);
    return slugify(title);
  }

  function getLectureTitle() {
    const li = document.querySelector(SELECTORS.liActive);
    const span = li?.querySelector(SELECTORS.liTitleSpan);
    const title = span?.textContent?.trim();
    log("🎞️ Lecture Title:", title);
    return slugify(title);
  }

  async function getVideoLength() {
    await wait(1500);
    const length =
      document.querySelector(SELECTORS.videoLength)?.textContent || "unknown";
    log("⏱️ Video Length:", length);
    return length;
  }

  function getSectionName() {
    try {
      const activeLi = document.querySelector(SELECTORS.liActive);
      const wrapperDiv = activeLi?.closest("div");
      const sectionDiv = wrapperDiv?.parentElement?.previousElementSibling;
      const heading = sectionDiv?.querySelector("h3");
      const sectionName = heading
        ? slugify(heading.textContent.trim())
        : "unknown-section";
      log("📂 Section Name:", sectionName);
      return sectionName;
    } catch {
      return "unknown-section";
    }
  }

  /** ========================================
   * SUBTITLE CAPTURE HANDLER
   * ======================================== */
  async function handleSubtitleCapture(content, url) {
    try {
      const videoLength = await getVideoLength();
      const payload = {
        url,
        content,
        title: getLectureTitle(),
        parentTitle: getCourseTitle(),
        videoLength,
        sectionName: getSectionName(),
        rootDirectory: "udemy",
      };

      log("📤 Sending subtitle data to server...", payload);
      ServerAPI.post("save-subtitles", payload);
    } catch (err) {
      error("⚠️ Failed to handle subtitle capture:", err);
    }
  }

  /** ========================================
   * SUBTITLE INTERCEPTORS (XHR + FETCH)
   * ======================================== */
  function setupSubtitleInterceptor() {
    log("🎣 Setting up subtitle interceptors (XHR + Fetch)...");

    // 1️⃣ Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._targetUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", async function () {
        try {
          if (
            this._targetUrl?.includes(".vtt") &&
            this._targetUrl.includes("en_US")
          ) {
            log("💾 [XHR] Subtitle URL Captured:", this._targetUrl);
            handleSubtitleCapture(this.responseText, this._targetUrl);
          }
        } catch (err) {
          error("⚠️ XHR Subtitle Capture Error:", err);
        }
      });
      return originalSend.apply(this, args);
    };

    // 2️⃣ Intercept fetch()
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      try {
        const url = args[0];
        if (
          typeof url === "string" &&
          url.includes(".vtt") &&
          url.includes("en_US")
        ) {
          log("💾 [FETCH] Subtitle URL Captured:", url);
          const clone = response.clone();
          const text = await clone.text();
          handleSubtitleCapture(text, url);
        }
      } catch (err) {
        error("⚠️ Fetch Subtitle Capture Error:", err);
      }
      return response;
    };

    log("✅ Subtitle interceptors active!");
  }

  /** ========================================
   * MAIN INITIALIZER
   * ======================================== */
  function init() {
    log("🚀 Initializing Udemy Subtitle Extractor...");
    setTimeout(setupSubtitleInterceptor, 3000);
    log("🔧 Waiting for subtitle or video requests...");
  }

  init();
})();
