(function () {
  "use strict";

  /** -------------------------------
   *  variables
   * ------------------------------- */

  // const urlAndPort = "https://town-living-1338.run-code.com/";
  const urlAndPort = "http://localhost:3000/";
  const trackQueryString = 'track[srclang="en-US"]';
  const timestampQuery = ".Timecode_module_timecode__66300889";
  const captionsQuery = ".CaptionsRenderer_module_captionsWindow__f2659eec";
  const progressBarQuery = ".FocusTarget_module_focusTarget__00a969cc"; // for video length 
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
        onload: (res) => console.log(`✅ [${endpoint}]`, res.responseText),
        onerror: (err) => console.error(`❌ [${endpoint}]`, err),
      });
    },
  };

  /** -------------------------------
   *  Subtitle Fetcher
   * ------------------------------- */
  const SubtitleFetcher = (() => {
    let sent = false;

    async function sendOnce() {
      if (sent) return;

      const enTrack = document.querySelector(trackQueryString);
      if (!enTrack) return console.warn("❌ No EN subtitle track found");

      const vttUrl = enTrack.src;
      if (!vttUrl) return console.warn("❌ Subtitle track has no src");

      // getting length of the video
      const slider = document.querySelector(progressBarQuery);
      const videoLength = slider.getAttribute("aria-valuetext");

      try {
        const res = await fetch(vttUrl);
        const text = await res.text();

        const title = getCleanTitle();
        ServerAPI.post("save-subtitles", {
          url: vttUrl,
          content: text,
          title,
          parentTitle: slugifyTitle(parentTitle),
          videoLength,
        });
        sent = true;
      } catch (err) {
        console.error("⚠️ Subtitle fetch failed:", err);
      }
    }

    return { sendOnce };
  })();

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
      console.log(canvas.toDataURL("image/jpeg")); // base64 jpeg

      return canvas.toDataURL("image/jpeg"); // base64 jpeg
    },
  };

  /** -------------------------------
   *  Utils
   * ------------------------------- */
  function getTimestamp() {
    return document.querySelector(timestampQuery)?.innerText || "unknown";
  }

  function getCaptions() {
    return document.querySelector(captionsQuery)?.innerText || "";
  }

  function getCleanTitle() {
    return document.title.split(" from ")[0].trim();
  }

  let parentTitle = null; // will hold parent page's title

  function slugifyTitle(title) {
    return title
      .toLowerCase()
      .replace(/\|.*$/, "") // remove everything after "|"
      .trim()
      .replace(/[^\w\s-]/g, "") // remove non-word chars except spaces/hyphens
      .replace(/\s+/g, "-"); // replace spaces with "-"
  }

  function getParentTitle() {
    let requested = false;

    function requestParentTitle() {
      if (!requested) {
        window.parent.postMessage({ type: "need-title" }, "*");
        requested = true;
      }
    }

    function handleMessage(event) {
      if (event.data?.type === "title-response") {
        parentTitle = event.data.title; // ✅ store in variable
        const currentTitle = document.title;

        console.log("📺 Current (iframe) Title:", currentTitle);
        console.log("🖼️ Parent Page Title:", parentTitle);

        // cleanup listener
        window.removeEventListener("message", handleMessage);
      }
    }

    // Listen once for parent's response
    window.addEventListener("message", handleMessage);

    // Request after DOM ready
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      requestParentTitle();
    } else {
      document.addEventListener("DOMContentLoaded", requestParentTitle);
    }
  }

  /** -------------------------------
   *  Hotkey Handler
   * ------------------------------- */
  function setupHotkeys() {
    document.addEventListener("keydown", async (e) => {
      if ((e.shiftKey && e.key.toLowerCase() === "s") || e.key === "F6") {
        try {
          const screenshot = ScreenshotCapturer.capture();
          const payload = {
            parentTitle: slugifyTitle(parentTitle),
            title: getCleanTitle(),
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
    getParentTitle();
    setTimeout(() => {
      SubtitleFetcher.sendOnce();
    }, 3000);
    setupHotkeys();
    console.log("🚀 Vimeo Screenshot Script Initialized");
  }

  init();
})();
