const DEFAULTS = {
  enabled: true,
  apiBase: "http://127.0.0.1:5000",
  endpoint: "/check"
};
const qs = (s) => document.querySelector(s);
const toggleEnabled = qs('#toggleEnabled');
const pillState = qs('#pillState');
const manualUrl = qs('#manualUrl');
const btnCheck = qs('#btnCheck');
const btnPaste = qs('#btnPaste');
const manualResult = qs('#manualResult');
const apiBase = qs('#apiBase');
const endpoint = qs('#endpoint');
const btnSave = qs('#btnSave');
const btnTest = qs('#btnTest');

function setPill(on) {
  pillState.textContent = on ? 'Đang bật' : 'Đang tắt';
  pillState.className = `pill ${on ? 'on' : 'off'}`;
}

function showManualResult(type, text) {
  manualResult.style.display = 'block';
  manualResult.className = `result ${type}`;
  manualResult.textContent = text;
}

// Load current settings
chrome.runtime.sendMessage({ type: 'getSettings' }, (res) => {
  const cfg = res?.ok ? res.data : DEFAULTS;
  toggleEnabled.checked = !!cfg.enabled;
  setPill(!!cfg.enabled);
  apiBase.value = cfg.apiBase || DEFAULTS.apiBase;
  endpoint.value = cfg.endpoint || DEFAULTS.endpoint;
});

// Toggle on/off
toggleEnabled.addEventListener('change', async (e) => {
  const enabled = !!e.target.checked;
  await chrome.runtime.sendMessage({ type: 'setSettings', payload: { enabled } });
  setPill(enabled);
});

// Save settings
btnSave.addEventListener('click', async () => {
  const payload = {
    apiBase: apiBase.value.trim() || DEFAULTS.apiBase,
    endpoint: endpoint.value.trim() || DEFAULTS.endpoint
  };
  await chrome.runtime.sendMessage({ type: 'setSettings', payload });
  showManualResult('ok', 'Đã lưu cài đặt.');
});

// Test connection
btnTest.addEventListener('click', async () => {
  const testUrl = 'https://example.com';
  const res = await chrome.runtime.sendMessage({ type: 'checkUrl', url: testUrl });
  if (!res?.ok) return showManualResult('err', `Lỗi kết nối API: ${res.error || 'không rõ'}`);
  showManualResult('ok', `Kết nối OK. Ví dụ phản hồi: ${JSON.stringify(res.data).slice(0, 120)}...`);
});

// Manual check
btnCheck.addEventListener('click', async () => {
  const url = (manualUrl.value || '').trim();
  if (!url) return showManualResult('err', 'Hãy nhập URL trước.');
  const res = await chrome.runtime.sendMessage({ type: 'checkUrl', url });
  if (!res?.ok) return showManualResult('err', `Lỗi: ${res.error || 'không rõ'}`);
  const { data } = res;
  const tag = data.malicious ? 'bad' : 'ok';
  showManualResult(tag, `${data.malicious ? '⚠️ Độc hại' : '✅ An toàn'} — ${data.url || url}`);
});

btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    manualUrl.value = text.trim();
  } catch {
    showManualResult('err', 'Không đọc được clipboard (trình duyệt không cho phép).');
  }
});