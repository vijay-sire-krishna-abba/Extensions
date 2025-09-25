// ---- Guard: Prevent duplicate loads ----
if (window.__vimeo_media_keys_loaded__) return;
window.__vimeo_media_keys_loaded__ = true;

const captionDivQuery = 'div[lang="en-US"]';
const controllerDivQuery = 'div[data-control-bar="true"]';
const progressBarQuery = 'div[data-progress-bar-played="true"]';
const playPauseBtnQuery = 'button[data-play-button="true"]';

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
        let subtitleSpan;
        if (capDiv) {
          subtitleSpan = capDiv.querySelector("span");
          if (subtitleSpan) {
            subtitleSpan.style.setProperty("font-size", "14px", "important");
            subtitleSpan.style.setProperty("opacity", "0", "important");

            console.log("📝 Subtitle font resized.");
          }
        } else {
        }

        const controllerDiv =
          document.querySelector(controllerDivQuery)?.parentElement;

        // default opacity
        controllerDiv.style.setProperty("opacity", "0", "important");

        // on hover
        controllerDiv.addEventListener("mouseenter", () => {
          controllerDiv.style.setProperty("opacity", "1", "important");
          subtitleSpan.style.setProperty("opacity", "1", "important");
        });

        // back to normal when mouse leaves
        controllerDiv.addEventListener("mouseleave", () => {
          controllerDiv.style.setProperty("opacity", "0", "important");
          subtitleSpan.style.setProperty("opacity", "0", "important");
        });

        // pause at 98% of progress
        // Select the progress bar element
        const progressBar = document.querySelector(progressBarQuery);

        // Function to check width
        function checkProgress() {
          if (!progressBar) return;

          // Get numeric width (strip % and convert to float)
          const width = parseFloat(progressBar.style.width);

          if (width >= 98.5) {
            console.log("Progress >= 98.5%, pausing video...");

            // Find and click the play/pause button
            const playPauseBtn = document.querySelector(playPauseBtnQuery);
            if (playPauseBtn) playPauseBtn.click();

            // Stop observing after first pause
            observer.disconnect();
            console.log("Observer stopped after pausing.");
          }
        }

        // Observe changes in the "style" attribute (width updates)
        const observer = new MutationObserver(checkProgress);
        observer.observe(progressBar, {
          attributes: true,
          attributeFilter: ["style"],
        });
        // true
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
