const controllerDivQuery = 'div[data-purpose="captions-cue-text"]';
const progressBarQuery =
  'div[data-purpose="video-progress-bar"] > div > div:nth-of-type(2)';
const playPauseBtnQuery = 'button[data-purpose="play-button"]'; // adjust if needed

/// waite for element
function waitForElement(selector, callback) {
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    }
  }, 100); // Check every 100ms
}

function initObserver() {
  const progressBar = document.querySelector(progressBarQuery);
  if (!progressBar) {
    console.warn("Progress bar not found, retrying in 1s...");
    setTimeout(initObserver, 1000);
    return;
  }

  function checkProgress() {
    const width = parseFloat(progressBar.style.width || "0");
    if (!isNaN(width) && width >= 98.5) {
      console.log("Progress >= 98.5%, pausing video...");

      const playPauseBtn = document.querySelector(playPauseBtnQuery);
      if (playPauseBtn) {
        playPauseBtn.click();
        console.log("Video paused.");
      } else {
        console.warn("Play/Pause button not found!");
      }

      observer.disconnect(); // stop after first trigger
      console.log("Observer stopped.");
    }
  }

  // Create observer
  const observer = new MutationObserver(checkProgress);
  observer.observe(progressBar, {
    attributes: true,
    attributeFilter: ["style"],
  });

  // Run initial check in case it's already past 98.5%
  checkProgress();
}

const hideSubtitles = () => {
  console.log("hiding subtitles✅");

  waitForElement(controllerDivQuery, (element) => {
    const controllerDiv = element?.parentElement;

    // default opacity
    controllerDiv.style.setProperty("opacity", "0", "important");

    // on hover
    controllerDiv.addEventListener("mouseenter", () => {
      controllerDiv.style.setProperty("opacity", "1", "important");
    });

    // back to normal when mouse leaves
    controllerDiv.addEventListener("mouseleave", () => {
      controllerDiv.style.setProperty("opacity", "0", "important");
    });

    // Kick it off
    initObserver();
  });
};

(function () {
  "use strict";
  navigator.mediaSession.setActionHandler("play", () =>
    document.querySelector('[data-purpose="play-button"]').click()
  );
  navigator.mediaSession.setActionHandler("pause", () =>
    document.querySelector('[data-purpose="pause-button"]').click()
  );
  // navigator.mediaSession.setActionHandler('previoustrack', () => document.querySelector('[data-purpose="rewind-skip-button"]').click());
  navigator.mediaSession.setActionHandler("nexttrack", () =>
    document.querySelector('[data-purpose="forward-skip-button"]').click()
  );

  // Site
  navigator.mediaSession.setActionHandler("previoustrack", () => {
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 5); // rewind 5s
    }
  });

  hideSubtitles();
})();
