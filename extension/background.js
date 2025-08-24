const DEFAULTS = {
  enabled: true,
  apiBase: "http://127.0.0.1:5000",
  endpoint: "/check"
};

// Ensure defaults exist
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...current });
});

// Helper: build API URL
function buildEndpoint(apiBase, endpoint) {
  try {
    const base = apiBase.replace(/\/$/, "");
    const ep = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
    return base + ep;
  } catch {
    return DEFAULTS.apiBase + DEFAULTS.endpoint;
  }
}

// Do the actual fetch here so it's not blocked by page HTTPS → HTTP
async function checkUrlRemote(url) {
  const { apiBase, endpoint } = await chrome.storage.sync.get(DEFAULTS);
  const full = buildEndpoint(apiBase, endpoint);
  try {
    const res = await fetch(full, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Message router
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "checkUrl") {
      const result = await checkUrlRemote(msg.url);
      sendResponse(result);
    } else if (msg?.type === "getSettings") {
      const cfg = await chrome.storage.sync.get(DEFAULTS);
      sendResponse({ ok: true, data: cfg });
    } else if (msg?.type === "setSettings") {
      await chrome.storage.sync.set(msg.payload || {});
      sendResponse({ ok: true });
    }
  })();
  // keep channel open for async
  return true;
});