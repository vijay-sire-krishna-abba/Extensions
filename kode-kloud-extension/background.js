const LOCAL_SERVER = "http://localhost:3000/screenshorts-with-timestamps";

async function queryActiveTab() {
  return new Promise((resolve) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      resolve(tabs[0])
    )
  );
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("sendMessage error:", chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// handle click on extension icon
chrome.action.onClicked.addListener(() => {
  captureVimeoFrame();
});

// handle hotkey
chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-tab") captureVimeoFrame();
});

async function captureVimeoFrame() {
  const tab = await queryActiveTab();
  if (!tab) return;

  console.log("🟢 Capture started on tab:", tab.url);

  // always query iframe (Vimeo content.js handles it)
  const vimeoData = await sendMessageToTab(tab.id, { action: "getVimeoData" });
  if (!vimeoData) {
    console.warn("⚠️ No data from Vimeo iframe");
    return;
  }
  console.log("📥 Received data from iframe:", vimeoData);

  // take screenshot of the visible tab
  chrome.tabs.captureVisibleTab(
    tab.windowId,
    { format: "jpeg", quality: 90 },
    (dataUrl) => {
      if (!dataUrl) return console.error("❌ Screenshot failed");

      const payload = {
        ...vimeoData,
        screenshot: dataUrl,
      };

      // show overlay
      chrome.tabs.sendMessage(tab.id, { action: "tabCaptured", dataUrl });

      // send to server
      fetch(LOCAL_SERVER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => r.text())
        .then((txt) => console.log("✅ Server response:", txt))
        .catch((err) => console.error("❌ Upload failed:", err));
    }
  );
}
