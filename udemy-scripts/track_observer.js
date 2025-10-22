

(function () {
  "use strict";

  console.log("🎬 Udemy Track Scanner Loaded");

  // ====== CONFIG ======
  const MATCH_EXTENSIONS = /\.vtt($|\?)/i;
  const SERVER_ENDPOINT = "http://localhost:3000/"; // ⬅️ change if needed
  const SEEN = new Set();
  const LOG = (msg, ...args) =>
    console.log("%c" + msg, "color:#4ade80;font-weight:bold;", ...args);

  // DOM Selectors
  const SELECTORS = {
    parentHeading: 'h1[data-purpose="course-header-title"]',
    videoLength: 'span[data-purpose="duration"]',
    liActive: 'li[aria-current="true"]',
    liTitleSpan: 'span[data-purpose="item-title"]',
  };

  /** ========================================
   * UTILITIES
   * ======================================== */

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const slugify = (text) =>
    text
      ?.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") || "unknown";

  function getCourseTitle() {
    const el = document.querySelector(SELECTORS.parentHeading);
    const title = el?.textContent?.trim();
    log("📘 Course Title:", title);
    return slugify(title);
  }

  function getLectureTitle() {
    const li = document.querySelector(SELECTORS.liActive);
    const span = li?.querySelector(SELECTORS.liTitleSpan);
    const title = span?.textContent?.trim();
    log("🎞️ Lecture Title:", title);
    return slugify(title);
  }

  async function getVideoLength() {
    await wait(1500);
    const length =
      document.querySelector(SELECTORS.videoLength)?.textContent || "unknown";
    log("⏱️ Video Length:", length);
    return length;
  }

  function getSectionName() {
    try {
      const activeLi = document.querySelector(SELECTORS.liActive);
      const wrapperDiv = activeLi?.closest("div");
      const sectionDiv = wrapperDiv?.parentElement?.previousElementSibling;
      const heading = sectionDiv?.querySelector("h3");
      const sectionName = heading
        ? slugify(heading.textContent.trim())
        : "unknown-section";
      log("📂 Section Name:", sectionName);
      return sectionName;
    } catch {
      return "unknown-section";
    }
  }

  // ====== HELPERS ======

  function sendToServer(payload) {
    fetch(SERVER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.warn("❌ Failed to send track data:", err));
  }

  // ====== MAIN TRACK PROCESSOR ======
  async function processTrack(track) {
    if (!track || !track.src) return;
    const src = track.src.trim();
    if (!src || SEEN.has(src) || !MATCH_EXTENSIONS.test(src)) return;

    SEEN.add(src);

    // const payload = {
    //   type: "track",
    //   url: src,
    //   label: track.label || null,
    //   language: track.srclang || null,
    //   kind: track.kind || null,
    //   courseTitle: getCourseTitle(),
    //   lectureTitle: getVideoTitle(),
    //   pageUrl: location.href,
    //   timestamp: new Date().toISOString(),
    // };

    const videoLength = await getVideoLength();

    const payload = {
      url,
      content,
      title: getLectureTitle(),
      parentTitle: getCourseTitle(),
      videoLength,
      sectionName: getSectionName(),
      rootDirectory: "udemy",
    };

    LOG("🎯 [TRACK FOUND]", payload);

    // Send to backend
    sendToServer(payload);
  }

  // ====== INITIAL SCAN ======
  function scanAllTracks() {
    document.querySelectorAll("track").forEach(processTrack);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAllTracks);
  } else {
    scanAllTracks();
  }

  // ====== WATCH FOR NEW TRACKS ======
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;

        if (node.tagName === "TRACK") {
          processTrack(node);
        }

        const nested = node.querySelectorAll?.("track");
        if (nested?.length) nested.forEach(processTrack);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.log(
    "%c👀 Watching for new <track> elements…",
    "color:#60a5fa;font-weight:bold;"
  );
})();
