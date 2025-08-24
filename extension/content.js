let lastCheckTime = 0;
const CHECK_INTERVAL = 1500; // ms
let currentUrl = '';
// runtime state mirrors storage
const state = {
  enabled: true,
  apiBase: "http://127.0.0.1:5000",
  endpoint: "/check"
};

// init from storage
chrome.runtime.sendMessage({ type: "getSettings" }, (res) => {
  if (res?.ok && res.data) Object.assign(state, res.data);
});

// react to settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const k of ["enabled", "apiBase", "endpoint"]) {
    if (k in changes) state[k] = changes[k].newValue;
  }
});

document.addEventListener("mouseover", async (e) => {
  if (!state.enabled) return;
  const url = extractUrlFromElement(e.target);
  if (!url) return;

  const now = Date.now();
  if (url === currentUrl && now - lastCheckTime < CHECK_INTERVAL) return;
  currentUrl = url;
  lastCheckTime = now;

  chrome.runtime.sendMessage({ type: "checkUrl", url }, (res) => {
    if (!res?.ok) {
      showWarningPopup(url, null, `Lỗi kết nối API: ${res?.error || "không rõ"}`);
      return;
    }
    const { data } = res;
    showWarningPopup(data.url || url, data.malicious);
  });
});

function extractUrlFromElement(el) {
  if (!el) return null;
  let url = null;
  const candidateAttrs = ["href", "data-href", "src", "title", "onclick"];
  for (const attr of candidateAttrs) {
    const val = el.getAttribute && el.getAttribute(attr);
    if (val && isValidUrl(val)) { url = val; break; }
  }
  if (!url && el.closest) {
    const parentLink = el.closest("a, [data-href]");
    if (parentLink) url = parentLink.href || parentLink.dataset.href;
  }
  // Unwrap some redirectors
  if (url && url.includes("l.facebook.com/l.php")) {
    const realUrl = new URL(url).searchParams.get("u");
    if (realUrl) url = decodeURIComponent(realUrl);
  }
  if (url && url.includes("www.google.com/url")) {
    const realUrl = new URL(url).searchParams.get("q");
    if (realUrl) url = decodeURIComponent(realUrl);
  }
  return url && isValidUrl(url) ? url : null;
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch { return false; }
}

// Toast popup
function showWarningPopup(url, malicious, errorMsg) {
  const existing = document.getElementById("malicious-warning");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "malicious-warning";
  const isErr = !!errorMsg;
  const color = isErr ? "#6b7280" : malicious ? "#ef4444" : "#10b981"; // gray/red/green
  const title = isErr ? "Không thể kiểm tra" : (malicious ? "URL độc hại" : "URL an toàn");
  const icon = isErr ? "⚙️" : (malicious ? "⚠️" : "✅");
  div.innerHTML = `
    <div class="mw-wrap" style="border-left-color:${color}">
      <div class="mw-header">
        <span class="mw-icon">${icon}</span>
        <strong>${title}</strong>
        <button class="mw-close" aria-label="Đóng">×</button>
      </div>
      <div class="mw-body">
        <div class="mw-url" title="${url}">${url}</div>
        ${isErr ? `<div class="mw-error">${errorMsg}</div>` : ""}
      </div>
    </div>`;
  document.body.appendChild(div);
  div.querySelector(".mw-close").addEventListener("click", () => div.remove());
  setTimeout(() => div.remove(), 6000);
}