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
  initProgressObserver();
})();
