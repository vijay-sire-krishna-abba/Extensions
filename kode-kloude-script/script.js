(function () {
  "use strict";

  /** -------------------------------
   *  variables
   * ------------------------------- */

  const urlAndPort = "http://localhost:3000/";
  const trackQueryString = 'track[srclang="en-US"]';
  const progressBarQuery = 'div[aria-label="Progress Bar"]';

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
   *  Utils
   * ------------------------------- */

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
   *  Main Init
   * ------------------------------- */
  function init() {
    getParentTitle();
    setTimeout(() => {
      SubtitleFetcher.sendOnce();
    }, 3000);
    console.log("🚀 Vimeo Screenshot Script Initialized");
  }
  init();
})();
