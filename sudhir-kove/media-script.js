(function () {
  "use strict";

  function setupMediaSession(rewindBtn, playBtn, forwardBtn) {
    console.log("🎵 Initializing MediaSession...");
    if (!("mediaSession" in navigator)) return;
    console.log("✅ navigator.mediaSession is available.");

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      // console.log("⏩ Forward →", forwardBtn);
      forwardBtn?.click();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      // console.log("⏪ Rewind →", rewindBtn);
      rewindBtn?.click();
    });

    navigator.mediaSession.setActionHandler("play", () => {
      // console.log("▶️ Play →", playBtn);
      playBtn?.click();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      // console.log("⏸️ Pause →", playBtn);
      playBtn?.click();
    });
  }

  function waitForButtons() {
    const playBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent.trim() === "Play"
    );

    if (!playBtn) {
      console.log("⏳ Waiting for Play button...");
      return false;
    }

    // Get sibling buttons (above and below Play)
    const rewindBtn = playBtn.previousElementSibling;
    const forwardBtn = playBtn.nextElementSibling;

    if (rewindBtn && forwardBtn) {
      console.log("✅ Found Rewind, Play, and Forward buttons.");
      setupMediaSession(rewindBtn, playBtn, forwardBtn);
      return true;
    }

    console.log("⏳ Waiting for sibling buttons...");
    return false;
  }

  // Try every 500ms until buttons appear (max 10s)
  let attempts = 0;
  const interval = setInterval(() => {
    if (waitForButtons() || attempts++ > 20) clearInterval(interval);
  }, 500);
})();
