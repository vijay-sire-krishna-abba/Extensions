// =============================
// Udemy Video Helper
// =============================

// ---------- Selectors ----------
const SELECTORS = {
  controllerDiv: 'div[data-purpose="captions-cue-text"]',
  progressBar:
    'div[data-purpose="video-progress-bar"] > div > div:nth-of-type(2)',
  playBtn: 'button[data-purpose="play-button"]',
  pauseBtn: 'button[data-purpose="pause-button"]',
  forwardBtn: 'button[data-purpose="forward-skip-button"]',
  video: "video",
};

// ---------- Utility: Wait for element ----------
function waitForElement(
  selector,
  callback,
  checkInterval = 100,
  timeout = 10000
) {
  const start = Date.now();
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    } else if (Date.now() - start > timeout) {
      clearInterval(interval);
      console.warn(`Timeout: Element not found -> ${selector}`);
    }
  }, checkInterval);
}

// ---------- Progress Observer ----------
function initProgressObserver() {
  const progressBar = document.querySelector(SELECTORS.progressBar);
  console.log(progressBar);
  if (!progressBar) {
    console.warn("Progress bar not found, retrying in 1s...");
    setTimeout(initProgressObserver, 1000);
    return;
  }

  function checkProgress() {
    const width = parseFloat(progressBar.style.width || "0");

    if (!isNaN(width) && width >= 98.5) {
      console.log("✅ Progress >= 98.5%, pausing video...");

      const playPauseBtn = document.querySelector(SELECTORS.pauseBtn);
      if (playPauseBtn) {
        playPauseBtn.click();
        console.log("▶️ Video paused.");
      } else {
        console.warn("⚠️ Play/Pause button not found!");
      }

      observer.disconnect(); // stop after first trigger
      console.log("🛑 Progress observer stopped.");
    }
  }

  const observer = new MutationObserver(checkProgress);
  observer.observe(progressBar, {
    attributes: true,
    attributeFilter: ["style"],
  });

  // Run initial check
  checkProgress();
}

// ---------- Subtitles Handler ----------
function hideSubtitles() {
  console.log("🎬 Hiding subtitles...");

  waitForElement(SELECTORS.controllerDiv, (element) => {
    const controllerDiv = element?.parentElement;
    if (!controllerDiv) return;

    // Default opacity
    controllerDiv.style.setProperty("opacity", "0", "important");

    // Show on hover
    controllerDiv.addEventListener("mouseenter", () => {
      controllerDiv.style.setProperty("opacity", "1", "important");
    });

    // Hide again on mouse leave
    controllerDiv.addEventListener("mouseleave", () => {
      controllerDiv.style.setProperty("opacity", "0", "important");
    });

    // Kick off observer after subtitles are found
    initProgressObserver();
  });
}

// ---------- MediaSession API ----------
function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.setActionHandler("play", () => {
    document.querySelector(SELECTORS.playBtn)?.click();
  });

  navigator.mediaSession.setActionHandler("pause", () => {
    document.querySelector(SELECTORS.pauseBtn)?.click();
  });

  navigator.mediaSession.setActionHandler("nexttrack", () => {
    document.querySelector(SELECTORS.forwardBtn)?.click();
  });

  navigator.mediaSession.setActionHandler("previoustrack", () => {
    const video = document.querySelector(SELECTORS.video);
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 5); // rewind 5s
    }
  });
}

// ---------- Init ----------
(function () {
  "use strict";
  setupMediaSession();
  hideSubtitles();
})();
