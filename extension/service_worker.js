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
      if (chrome.runtime.lastError) {
        console.error('[PromptFence] Storage error:', chrome.runtime.lastError.message);
        return;
      }
      if (!result.preset) {
        // Initialize with default preset
        chrome.storage.sync.set({
          preset: 'personal',
          enableWarn: true,
          enableBlock: true,
          debugMode: false
        }, function() {
          if (chrome.runtime.lastError) {
            console.error('[PromptFence] Storage set error:', chrome.runtime.lastError.message);
            return;
          }
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
  // Open options page (called from modals)
  if (message.type === 'OPEN_OPTIONS') {
    try {
      chrome.runtime.openOptionsPage(function() {
        if (chrome.runtime.lastError) {
          console.log('[PromptFence] openOptionsPage error:', chrome.runtime.lastError.message);
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      });
    } catch (e) {
      console.error('[PromptFence] openOptionsPage exception:', e.message);
      sendResponse({ ok: false, error: e.message });
    }
    return true; // async response
  }

  // Get current config from sync storage
  if (message.type === 'GET_CONFIG') {
    try {
      chrome.storage.sync.get(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode'], function(result) {
        if (chrome.runtime.lastError) {
          console.error('[PromptFence] Storage get error:', chrome.runtime.lastError.message);
          sendResponse({ config: null, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ config: result });
      });
    } catch (e) {
      console.error('[PromptFence] Storage get exception:', e.message);
      sendResponse({ config: null, error: e.message });
    }
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

  // Unknown message type - respond gracefully
  sendResponse({ ok: false, error: 'Unknown message type' });
  return false;
});
