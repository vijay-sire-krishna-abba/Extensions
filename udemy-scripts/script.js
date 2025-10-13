(function () {
  "use strict";

  console.log("📥 Udemy Subtitle Extractor LOADED");

  // Variables
  const urlAndPort = "http://localhost:3000/";
  const parentHeadingQuery = 'h1[data-purpose="course-header-title"]';
  const videoLengthQuery = 'span[data-purpose="duration"]';
  const timestampQuery = 'span[data-purpose="current-time"]';
  const captionsQuery = 'div[data-purpose="captions-cue-text"]';

  const liElQuery = 'li[aria-current="true"]';
  const liSpanElQuery = 'span[data-purpose="item-title"]';
  let count = 0;

  /** -------------------------------
   *  Server API
   * ------------------------------- */
  const ServerAPI = {
    post: (endpoint, data) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: `${urlAndPort}${endpoint}`,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
        onload: (res) =>
          console.log(`✅ [${endpoint}] Sent:`, res.responseText),
        onerror: (err) => console.error(`❌ [${endpoint}]`, err),
      });
    },
  };

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

  /** -------------------------------
   *  Subtitle Fetcher
   * ------------------------------- */

  const SubtitleFetcher = () => {
    // --- Hook XMLHttpRequest ---
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._targetUrl = url;
      return origOpen.call(this, method, url, ...rest);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", async function () {
        try {
          if (
            this._targetUrl &&
            this._targetUrl.includes(".vtt") &&
            this._targetUrl.includes("en_US")
          ) {
            console.log(this._targetUrl);

            const videoLength = await getCurrentLength();

            // Send to server
            ServerAPI.post("save-subtitles", {
              url: this._targetUrl,
              content: this.responseText,
              title: getCurrentTitle(),
              parentTitle: getParentTitle(),
              videoLength: videoLength,
              sectionName: getSectionName(),
              rootDirectory: "udemy",
            });
          }
        } catch (err) {
          console.error("Subtitle XHR capture error:", err);
        }
      });
      return origSend.apply(this, args);
    };
  };

  /** -------------------------------
   *  Screenshot Capturer
   * ------------------------------- */
  const ScreenshotCapturer = {
    capture: () => {
      const video = document.querySelector("video");
      if (!video) throw new Error("No video element");

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log(canvas.toDataURL("image/jpeg")); // base64 JPEG

      return canvas.toDataURL("image/jpeg"); // base64 JPEG
    },
  };

  /** -------------------------------
   *  Hotkey Handler
   * ------------------------------- */
  function setupHotkeys() {
    document.addEventListener("keydown", async (e) => {
      if ((e.shiftKey && e.key.toLowerCase() === "s") || e.key === "F6") {
        try {
          const screenshot = ScreenshotCapturer.capture();
          const payload = {
            parentTitle: getParentTitle(),
            title: getCurrentTitle(),
            timestamp: getTimestamp(),
            captions: getCaptions(),
            screenshot,
          };
          console.log("📤 Payload:", payload);
          ServerAPI.post("screenshorts-with-timestamps", payload);
        } catch (err) {
          console.error("⚠️ Capture failed:", err);
        }
      }
    });
  }

  /** -------------------------------
   *  Main Init
   * ------------------------------- */
  function init() {
    setTimeout(() => {
      SubtitleFetcher();
    }, 3000);
    // setupHotkeys();
    console.log("🚀 Vimeo Screenshot Script Initialized");
  }

  init();

  // end
})();
