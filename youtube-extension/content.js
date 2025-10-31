// content.js

// Variables
const urlAndPort = "http://localhost:3000/";
const parentHeadingQuery = "text-container"; // div  id="text-container"
const videoLengthQuery = 'span[class="ytp-time-duration"]'; // span class="ytp-time-duration"
const timestampQuery = 'span[class="ytp-time-current"]'; // span class="ytp-time-current"
const captionsQuery = 'span[class="captions-text"]'; // span class="captions-text"

// const liElQuery = 'li[aria-current="true"]';
// const liSpanElQuery = 'title';  // title

const titleQuery = "title";

// Helper to slugify a title
function slugifyTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-"); // spaces -> hyphens
}

// Respond to messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getParentTitle") {
    // selector used previously in your userscript
    const el = document.getElementById(parentHeadingQuery);
    const raw = el ? el.textContent.trim() : "";
    const parentTitle = slugifyTitle(raw);

    // Title
    // From inside that <li>, find the span[data-purpose="item-title"]
    // Get its text
    const titleEl = document.querySelector(titleQuery);
    const titleText = titleEl ? titleEl.textContent.trim() : null;
    const title = slugifyTitle(titleText);

    const timestamp =
      document.querySelector(timestampQuery)?.innerText || "unknown";

    const captions = document.querySelector(captionsQuery)?.innerText || "";

    const sectionName = title;

    console.log(parentTitle, title, timestamp, captions, sectionName);

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
