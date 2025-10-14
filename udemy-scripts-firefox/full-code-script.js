// ==UserScript==
// @name         Udemy Subtitle Extractor (Chrome + Firefox)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Capture Udemy subtitle (.vtt) files and send them to localhost server
// @match        *://*.udemy.com/course/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @inject-into  page
// ==/UserScript==

(function () {
  "use strict";

  const SERVER_URL = "http://localhost:3000/save-subtitles";

  console.log("[Udemy Subtitle Extractor] Script loaded");

  // Confirm context
  console.log(
    "[Udemy Subtitle Extractor] Context:",
    window === unsafeWindow ? "sandbox" : "page"
  );

  // Helper: send subtitle to local server
  function sendToServer(data) {
    GM_xmlhttpRequest({
      method: "POST",
      url: SERVER_URL,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(data),
      onload: (res) =>
        console.log(
          "✅ Subtitle sent to server:",
          res.status,
          res.statusText || ""
        ),
      onerror: (err) =>
        console.error("❌ Failed to send subtitle to server:", err),
    });
  }

  // Helper: get metadata (optional)
  function getCourseInfo() {
    const title = document.title.replace(" | Udemy", "").trim();
    const section =
      document
        .querySelector(".section--section-title--8blTh")
        ?.textContent?.trim() || "Unknown Section";
    return { title, section };
  }

  // --- Hook Fetch API ---
  (function hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes(".vtt")) {
        console.log("🎯 [fetch] Captured subtitle:", url);
        try {
          const text = await response.clone().text();
          const info = getCourseInfo();
          sendToServer({
            url,
            content: text,
            source: "fetch",
            courseTitle: info.title,
            sectionTitle: info.section,
            capturedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error("❌ Error reading fetched subtitle:", err);
        }
      }

      return response;
    };
  })();

  // --- Hook XHR (for older subtitle loaders) ---
  (function hookXHR() {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      this._url = args[1];
      return origOpen.apply(this, args);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", function () {
        if (this._url && this._url.includes(".vtt")) {
          console.log("🎯 [XHR] Captured subtitle:", this._url);
          try {
            const text = this.responseText;
            const info = getCourseInfo();
            sendToServer({
              url: this._url,
              content: text,
              source: "xhr",
              courseTitle: info.title,
              sectionTitle: info.section,
              capturedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error("❌ Error reading XHR subtitle:", err);
          }
        }
      });
      return origSend.apply(this, args);
    };
  })();

  console.log("[Udemy Subtitle Extractor] Hooks installed");
})();
