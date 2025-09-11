// background.js
const LOCAL_SERVER = "http://localhost:3000/screenshorts-with-timestamps";

/** Helper: promisified queries/messaging */
function queryActiveTab() {
  return new Promise((resolve) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      resolve(tabs[0])
    )
  );
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      // If content script not available, chrome.runtime.lastError is set
      if (chrome.runtime.lastError) {
        console.warn("sendMessage error:", chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// Trigger via toolbar click
chrome.action.onClicked.addListener(() => {
  captureActiveUdemyTab();
});

// Trigger via hotkey
chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-tab") captureActiveUdemyTab();
});

async function captureActiveUdemyTab() {
  const tab = await queryActiveTab();
  if (!tab) {
    console.warn("No active tab found");
    return;
  }

  if (!tab.url || !tab.url.includes("udemy.com")) {
    console.warn("⚠️ Not a Udemy tab. Capture skipped.");
    return;
  }

  // Ask content script for parentTitle (slugified)
  const resp = await sendMessageToTab(tab.id, { action: "getParentTitle" });
  const parentTitle = resp?.parentTitle || "";
  const title = resp?.title || "";
  const timestamp = resp?.timestamp || "";
  const captions = resp?.captions || "";

  // Capture visible tab (use jpeg with quality or png)
  chrome.tabs.captureVisibleTab(
    tab.windowId,
    { format: "jpeg", quality: 90 },
    (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.error("❌ Capture failed", chrome.runtime.lastError);
        return;
      }

      // Show overlay in page
      chrome.tabs.sendMessage(tab.id, { action: "tabCaptured", dataUrl });

      // Build payload exactly how server expects: screenshot key contains data URL
      const payload = {
        parentTitle,
        title,
        timestamp,
        captions,
        screenshot: dataUrl,
      };

      // Send as JSON (server expects screenshot in req.body.screenshot)
      fetch(LOCAL_SERVER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.text())
        .then((text) => console.log("✅ Server response:", text))
        .catch((err) => console.error("❌ Upload failed:", err));
    }
  );
}
