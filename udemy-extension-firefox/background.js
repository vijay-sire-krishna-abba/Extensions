// background.js
const LOCAL_SERVER = "http://localhost:3000/screenshorts-with-timestamps";

// Polyfill: make browser.* available even if only chrome.* exists
if (typeof browser === "undefined") {
  var browser = chrome;
}

// Query the active tab
function queryActiveTab() {
  return browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => tabs[0]);
}

// Send message to content script
function sendMessageToTab(tabId, message) {
  return browser.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn("sendMessage error:", err);
    return null;
  });
}

// Toolbar button click
browser.browserAction.onClicked.addListener(() => {
  captureActiveUdemyTab();
});

// Keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === "capture-tab") captureActiveUdemyTab();
});

async function captureActiveUdemyTab() {
  const tab = await queryActiveTab();
  if (!tab || !tab.url || !tab.url.includes("udemy.com")) {
    console.warn("⚠️ Not a Udemy tab. Capture skipped.");
    return;
  }

  // Ask content script for page data
  const resp = await sendMessageToTab(tab.id, { action: "getParentTitle" });
  if (!resp) {
    console.warn("⚠️ No response from content script");
    return;
  }

  const { parentTitle, title, timestamp, captions, sectionName } = resp;

  // Capture visible tab
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "jpeg",
    quality: 90,
  });

  // Show overlay image on the page
  browser.tabs.sendMessage(tab.id, { action: "tabCaptured", dataUrl });

  const payload = {
    parentTitle,
    title,
    timestamp,
    captions,
    screenshot: dataUrl,
    sectionName,
    rootDirectory: "udemy",
  };

  // Send screenshot data to local server
  fetch(LOCAL_SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.text())
    .then((text) => console.log("✅ Server response:", text))
    .catch((err) => console.error("❌ Upload failed:", err));
}
