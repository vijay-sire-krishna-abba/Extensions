console.log("🎥 Vimeo content script loaded");

function getCleanTitle() {
  return document.title.split(" from ")[0].trim();
}

function slugifyParentTitle(parentTitle) {
  return parentTitle
    .toLowerCase()
    .replace(/\|.*$/, "") // remove everything after "|"
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word chars except spaces/hyphens
    .replace(/\s+/g, "-"); // replace spaces with "-"
}

// helper to get timestamp + captions
function getVimeoData() {
  const timestamp = document
    .querySelector('div[data-progress-bar-timecode="true"]')
    ?.textContent.trim();

  // Select the div with lang="en-US"
  // Select the first <span> inside it

  const capDiv = document.querySelector('div[lang="en-US"]');
  const snapOne = capDiv?.querySelector("span");
  const captions = snapOne?.textContent.trim();

  let title = document.title || "";
  title = getCleanTitle(title);

  return { title, timestamp, captions };
}

// ask parent for course title (Tampermonkey responds)
function requestParentTitle() {
  return new Promise((resolve) => {
    window.parent.postMessage({ type: "need-title" }, "*");

    function handler(event) {
      if (event.data?.type === "title-response") {
        console.log("📥 Got parent title from parent page:", event.data.title);
        window.removeEventListener("message", handler);
        resolve(event.data.title);
      }
    }

    window.addEventListener("message", handler);
  });
}

// respond when background asks
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getVimeoData") {
    const data = getVimeoData();

    requestParentTitle().then((parentTitle) => {
      data.parentTitle = slugifyParentTitle(parentTitle);
      console.log("📤 Sending Vimeo data with parent title:", data);
      sendResponse(data);
    });

    // async response
    return true;
  }

  if (msg.action === "tabCaptured") {
    const img = document.createElement("img");
    img.src = msg.dataUrl;
    img.style.maxWidth = "300px";
    img.style.position = "fixed";
    img.style.top = "10px";
    img.style.right = "10px";
    img.style.zIndex = 99999;
    img.style.border = "3px solid red";
    img.style.background = "white";
    img.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    document.body.appendChild(img);

    setTimeout(() => img.remove(), 2000);
  }
});
