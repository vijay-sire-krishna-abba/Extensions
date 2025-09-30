// content.js

// Variables
const urlAndPort = "http://localhost:3000/";
const parentHeadingQuery = 'h1[data-purpose="course-header-title"] a';
const videoLengthQuery = 'span[data-purpose="duration"]';
const timestampQuery = 'span[data-purpose="current-time"]';
const captionsQuery = 'div[data-purpose="captions-cue-text"]';

const liElQuery = 'li[aria-current="true"]';
const liSpanElQuery = 'span[data-purpose="item-title"]';

// Helper to slugify a title
function slugifyTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-"); // spaces -> hyphens
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

// Respond to messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getParentTitle") {
    // selector used previously in your userscript
    const el = document.querySelector(parentHeadingQuery);
    const raw = el ? el.textContent.trim() : "";
    const parentTitle = slugifyTitle(raw);

    // Title
    // From inside that <li>, find the span[data-purpose="item-title"]
    // Get its text
    const liEl = document.querySelector(liElQuery);
    const spanEl = liEl ? liEl.querySelector(liSpanElQuery) : null;
    const titleText = spanEl ? spanEl.textContent.trim() : null;
    const title = slugifyTitle(titleText);

    const timestamp =
      document.querySelector(timestampQuery)?.innerText || "unknown";

    const captions = document.querySelector(captionsQuery)?.innerText || "";

    const sectionName = getSectionName();

    // sendResponse synchronously
    sendResponse({ parentTitle, title, timestamp, captions, sectionName });
    // Return true only for async responses; not needed here but harmless
    return;
  }

  if (msg.action === "tabCaptured") {
    const dataUrl = msg.dataUrl;
    console.log("✅ Screenshot received");

    // Create overlay image
    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.maxWidth = "300px";
    img.style.position = "fixed";
    img.style.top = "10px";
    img.style.right = "10px";
    img.style.zIndex = 99999;
    img.style.border = "3px solid red";
    img.style.background = "white";
    img.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    document.body.appendChild(img);

    // Auto-remove overlay after 5 seconds
    setTimeout(() => {
      img.remove();
    }, 5000);
  }
});
