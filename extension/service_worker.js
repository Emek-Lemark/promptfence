// service_worker.js - Minimal/no-op for v1
// Required by Manifest V3 but not used in this version

chrome.runtime.onInstalled.addListener(function() {
  console.log('[PromptFence] Extension installed');
});
