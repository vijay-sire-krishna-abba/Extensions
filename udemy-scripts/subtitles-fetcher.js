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

  /** ========================================
   * SERVER API HANDLER
   * ======================================== */
  const ServerAPI = {
    post(endpoint, data) {
      console.log(`🌐 [POST] Sending to: ${endpoint}`, data);
      GM_xmlhttpRequest({
        method: "POST",
        url: `${SERVER_URL}${endpoint}`,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
        onload: (res) =>
          console.log(`✅ [${endpoint}] Response:`, res.responseText),
        onerror: (err) => console.error(`❌ [${endpoint}] Error:`, err),
      });
    },
  };

  /** ========================================
   * UTILITIES
   * ======================================== */

  // Delay helper
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Format title into a slug
  const slugify = (text) =>
    text
      ?.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") || "unknown";

  // Get course title
  function getCourseTitle() {
    const el = document.querySelector(SELECTORS.parentHeading);
    const title = el?.textContent?.trim();
    console.log("📘 Course Title:", title);
    return slugify(title);
  }

  // Get current lecture title
  function getLectureTitle() {
    const li = document.querySelector(SELECTORS.liActive);
    const span = li?.querySelector(SELECTORS.liTitleSpan);
    const title = span?.textContent?.trim();
    console.log("🎞️ Lecture Title:", title);
    return slugify(title);
  }

  // Get video length (with slight delay to ensure DOM updates)
  async function getVideoLength() {
    await wait(1500);
    const length =
      document.querySelector(SELECTORS.videoLength)?.textContent || "unknown";
    console.log("⏱️ Video Length:", length);
    return length;
  }

  // Extract section name (optional - for better file organization)
  function getSectionName() {
    try {
      const activeLi = document.querySelector(SELECTORS.liActive);
      const wrapperDiv = activeLi?.closest("div");
      const sectionDiv = wrapperDiv?.parentElement?.previousElementSibling;
      const heading = sectionDiv?.querySelector("h3");
      const sectionName = heading
        ? slugify(heading.textContent.trim())
        : "unknown-section";
      console.log("📂 Section Name:", sectionName);
      return sectionName;
    } catch {
      return "unknown-section";
    }
  }

  /** ========================================
   * SUBTITLE FETCHER
   * ======================================== */
  function setupSubtitleInterceptor() {
    console.log("🎣 Setting up subtitle interceptor...");

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
            console.log("💾 Subtitle URL Captured:", this._targetUrl);

            const videoLength = await getVideoLength();
            const data = {
              url: this._targetUrl,
              content: this.responseText,
              title: getLectureTitle(),
              parentTitle: getCourseTitle(),
              videoLength,
              sectionName: getSectionName(),
              rootDirectory: "udemy",
            };

            console.log("📤 Sending subtitle data to server...");
            ServerAPI.post("save-subtitles", data);
          }
        } catch (err) {
          console.error("⚠️ Subtitle Capture Error:", err);
        }
      });

      return originalSend.apply(this, args);
    };

    console.log("✅ Subtitle interceptor ready!");
  }

  /** ========================================
   * MAIN INITIALIZER
   * ======================================== */
  function init() {
    console.log("🚀 Initializing Udemy Subtitle Extractor...");

    // Start subtitle capture after a short delay (ensures DOM & XHR ready)
    setTimeout(setupSubtitleInterceptor, 3000);

    console.log("🔧 Waiting for video/subtitle requests...");
  }

  init();

  // End of Script
})();
