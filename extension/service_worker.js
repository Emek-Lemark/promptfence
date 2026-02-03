// service_worker.js - Background service worker
// Store MVP: Local-only mode, no backend communication

/**
 * Initialize default settings on install.
 */
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('[PromptFence] Extension installed:', details.reason);

  // Set default config if this is a fresh install
  if (details.reason === 'install') {
    chrome.storage.sync.get(['preset'], function(result) {
      if (!result.preset) {
        // Initialize with default preset
        chrome.storage.sync.set({
          preset: 'personal',
          enableWarn: true,
          enableBlock: true,
          debugMode: false
        }, function() {
          console.log('[PromptFence] Default settings initialized');
        });
      }
    });
  }
});

/**
 * Handle browser startup.
 */
chrome.runtime.onStartup.addListener(function() {
  console.log('[PromptFence] Browser startup');
});

/**
 * Listen for messages from content script.
 * Store MVP: Only handle local config operations.
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // Get current config from sync storage
  if (message.type === 'GET_CONFIG') {
    chrome.storage.sync.get(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode'], function(result) {
      sendResponse({ config: result });
    });
    return true; // async response
  }

  // No-op for legacy messages (backward compatibility)
  if (message.type === 'FETCH_CONFIG' || message.type === 'TEST_CONFIG_FETCH') {
    // Return empty config - content script will use local presets
    sendResponse({ config: null });
    return false;
  }

  if (message.type === 'POST_EVENT') {
    // Store MVP: Events are NOT sent to any backend
    // This is intentional - no data leaves the browser
    if (message.debugMode) {
      console.log('[PromptFence] Event (local only):', message.eventData);
    }
    sendResponse({ ok: true, localOnly: true });
    return false;
  }
});
