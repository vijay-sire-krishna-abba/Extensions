// ---- Guard: Prevent duplicate loads ----
if (window.__vimeo_media_keys_loaded__) return;
window.__vimeo_media_keys_loaded__ = true;

const captionDivQuery = 'div[lang="en-US"]';
const controllerDivQuery = ".ControlBarV1_module_controlBarWrapper__cf14f860";

(function () {
  "use strict";

  /* ---------------- Utilities ---------------- */
  const Utils = {
    waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const timer = setInterval(() => {
          const el = document.querySelector(selector);
          if (el) {
            clearInterval(timer);
            resolve(el);
          }
          if (Date.now() - start > timeout) {
            clearInterval(timer);
            reject(new Error(`Timeout: ${selector}`));
          }
        }, 100);
      });
    },
  };

  /* ---------------- Subtitles ---------------- */
  const Subtitles = {
    interceptVTT() {
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (url.includes(".vtt")) {
          console.log("🎞 Found subtitle VTT:", url);
          GM_download({
            url,
            name: "subtitles.vtt",
            saveAs: true,
          });
        }
        return origOpen.apply(this, arguments);
      };
    },

    adjustFontSize() {
      setTimeout(() => {
        const capDiv = document.querySelector(captionDivQuery);
        if (capDiv) {
          const subtitleSpan = capDiv.querySelector("span");
          if (subtitleSpan) {
            subtitleSpan.style.setProperty("font-size", "14px", "important");
            subtitleSpan.style.setProperty("opacity", "0.3", "important");
            console.log("📝 Subtitle font resized.");
          }
        }

        const controllerDiv = document.querySelector(controllerDivQuery);
        controllerDiv.style.setProperty("opacity", "0.3", "important");
      }, 1000);
    },
  };

  /* ---------------- Media Keys ---------------- */
  const MediaKeys = {
    bind(video) {
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        video.currentTime = Math.max(0, video.currentTime - 5);
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
      });

      navigator.mediaSession.setActionHandler("play", () => video.play());
      navigator.mediaSession.setActionHandler("pause", () => video.pause());

      console.log("🎬 Media key handlers attached.");
    },
  };

  /* ---------------- Main ---------------- */
  let lastVideo = null;

  async function bindToVideo() {
    try {
      Subtitles.interceptVTT();

      const video = await Utils.waitForElement("video");
      if (!video || video === lastVideo) return;

      lastVideo = video;
      MediaKeys.bind(video);
      Subtitles.adjustFontSize();
    } catch (e) {
      console.warn("⚠️ Failed to bind video:", e);
    }
  }

  function initMutationObserver() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        lastVideo = null;
        setTimeout(bindToVideo, 2000);
      }
    }).observe(document, { childList: true, subtree: true });

    console.log("🔁 Mutation observer initialized.");
  }

  // Kickstart
  setTimeout(() => {
    bindToVideo();
    initMutationObserver();
  }, 2000);
})();
