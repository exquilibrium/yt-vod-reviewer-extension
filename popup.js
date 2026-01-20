const AUTO_SHOW_KEY = "vod_auto_show_v1";
const AUTO_PAUSE_RANGE_KEY = "vod_auto_pause_range_v1";

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs.length ? tabs[0] : null);
    });
  });
}

function sendToContentScript(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (resp) => {
      // If the tab has no content script (not a YouTube watch page), runtime.lastError can appear.
      resolve({ resp, lastError: chrome.runtime.lastError });
    });
  });
}

// Auto show window
async function loadAutoShowSetting() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTO_SHOW_KEY], (res) => {
      resolve(Boolean(res[AUTO_SHOW_KEY]));
    });
  });
}

async function saveAutoShowSetting(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTO_SHOW_KEY]: value }, () => resolve());
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const autoShowChk = document.getElementById("autoShowChk");
  const showWindowBtn = document.getElementById("showWindowBtn");

  // Initialize checkbox from storage
  autoShowChk.checked = await loadAutoShowSetting();

  autoShowChk.addEventListener("change", async () => {
    await saveAutoShowSetting(autoShowChk.checked);
    setStatus(autoShowChk.checked ? "Auto show enabled." : "Auto show disabled.");

    // Optional: tell the current tab immediately (if it's a watch page)
    const tab = await getActiveTab();
    if (tab?.id) {
      await sendToContentScript(tab.id, {
        type: "SET_AUTO_SHOW",
        value: autoShowChk.checked
      });
    }
  });

  showWindowBtn.addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus("No active tab.");
      return;
    }

    const { lastError } = await sendToContentScript(tab.id, { type: "SHOW_WINDOW" });

    if (lastError) {
      setStatus("Open a YouTube watch page to use this.");
      return;
    }

    setStatus("Window shown.");
    window.close(); // optional: close popup after action
  });
});

// Auto pause timestamp range
async function loadAutoPauseRangeSetting() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTO_PAUSE_RANGE_KEY], (res) => {
      // Default ON if unset
      const v = res[AUTO_PAUSE_RANGE_KEY];
      resolve(v === undefined ? true : Boolean(v));
    });
  });
}

async function saveAutoPauseRangeSetting(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTO_PAUSE_RANGE_KEY]: value }, () => resolve());
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const autoShowChk = document.getElementById("autoShowChk");
  const autoPauseRangeChk = document.getElementById("autoPauseRangeChk");
  const showWindowBtn = document.getElementById("showWindowBtn");

  // Initialize from storage
  autoShowChk.checked = await loadAutoShowSetting();
  autoPauseRangeChk.checked = await loadAutoPauseRangeSetting();

  autoShowChk.addEventListener("change", async () => {
    await saveAutoShowSetting(autoShowChk.checked);
    setStatus(autoShowChk.checked ? "Auto show enabled." : "Auto show disabled.");

    const tab = await getActiveTab();
    if (tab?.id) {
      await sendToContentScript(tab.id, {
        type: "SET_AUTO_SHOW",
        value: autoShowChk.checked
      });
    }
  });

  autoPauseRangeChk.addEventListener("change", async () => {
    await saveAutoPauseRangeSetting(autoPauseRangeChk.checked);
    setStatus(
      autoPauseRangeChk.checked
        ? "Auto pause range enabled."
        : "Auto pause range disabled."
    );

    const tab = await getActiveTab();
    if (tab?.id) {
      await sendToContentScript(tab.id, {
        type: "SET_AUTO_PAUSE_RANGE",
        value: autoPauseRangeChk.checked
      });
    }
  });

  showWindowBtn.addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus("No active tab.");
      return;
    }

    const { lastError } = await sendToContentScript(tab.id, { type: "SHOW_WINDOW" });

    if (lastError) {
      setStatus("Open a YouTube watch page to use this.");
      return;
    }

    // (Optional but nice) also push settings when opening window
    await sendToContentScript(tab.id, {
      type: "SET_AUTO_PAUSE_RANGE",
      value: autoPauseRangeChk.checked
    });

    setStatus("Window shown.");
    window.close();
  });
});

