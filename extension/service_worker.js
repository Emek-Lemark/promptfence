// service_worker.js - Background service worker
// Supports both personal (local-only) and team (backend-connected) modes

const API_BASE = 'https://app.promptfence.ai';
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize default settings on install.
 */
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('[PromptFence] Extension installed:', details.reason);

  if (details.reason === 'install') {
    chrome.storage.sync.get(['preset'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('[PromptFence] Storage error:', chrome.runtime.lastError.message);
        return;
      }
      if (!result.preset) {
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
 * Handle browser startup - refresh team config if connected.
 */
chrome.runtime.onStartup.addListener(function() {
  console.log('[PromptFence] Browser startup');
  refreshTeamConfigIfNeeded();
});

/**
 * Fetch team config from backend and cache it locally.
 */
async function fetchTeamConfig(installCode) {
  try {
    const res = await fetch(`${API_BASE}/api/config`, {
      headers: { 'X-Install-Code': installCode }
    });
    if (!res.ok) {
      console.error('[PromptFence] Team config fetch failed:', res.status);
      return null;
    }
    const data = await res.json();
    // Cache the config
    await chrome.storage.local.set({
      teamConfig: data,
      teamConfigFetchedAt: Date.now()
    });
    return data;
  } catch (e) {
    console.error('[PromptFence] Team config fetch error:', e.message);
    return null;
  }
}

/**
 * Refresh team config if install code exists and cache is stale.
 */
function refreshTeamConfigIfNeeded() {
  chrome.storage.local.get(['installCode', 'teamConfig', 'teamConfigFetchedAt'], function(result) {
    if (!result.installCode) return;
    const age = Date.now() - (result.teamConfigFetchedAt || 0);
    if (age > CONFIG_CACHE_TTL || !result.teamConfig) {
      fetchTeamConfig(result.installCode);
    }
  });
}

/**
 * Report a platform visit to the backend (shadow AI discovery).
 */
async function reportPlatformVisit(installCode, aiDomain) {
  try {
    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Install-Code': installCode
      },
      body: JSON.stringify({
        type: 'platform_visit',
        aiDomain: aiDomain
      })
    });
  } catch (e) {
    // Silent fail — non-critical
  }
}

/**
 * Report a detection event to the backend.
 */
async function reportEvent(installCode, eventData) {
  try {
    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Install-Code': installCode
      },
      body: JSON.stringify(eventData)
    });
  } catch (e) {
    // Silent fail — non-critical
  }
}

/**
 * Periodically refresh team config (every 5 min while browser is active).
 */
chrome.alarms.create('refreshTeamConfig', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'refreshTeamConfig') {
    refreshTeamConfigIfNeeded();
  }
});

/**
 * Listen for messages from content script.
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // Open options page
  if (message.type === 'OPEN_OPTIONS') {
    try {
      chrome.runtime.openOptionsPage(function() {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }

  // Get current config from sync storage (personal mode)
  if (message.type === 'GET_CONFIG') {
    try {
      chrome.storage.sync.get(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode'], function(result) {
        if (chrome.runtime.lastError) {
          sendResponse({ config: null, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ config: result });
      });
    } catch (e) {
      sendResponse({ config: null, error: e.message });
    }
    return true;
  }

  // Fetch team config (called by content script)
  if (message.type === 'FETCH_TEAM_CONFIG') {
    chrome.storage.local.get(['installCode', 'teamConfig', 'teamConfigFetchedAt'], function(result) {
      if (!result.installCode) {
        sendResponse({ teamConfig: null });
        return;
      }
      const age = Date.now() - (result.teamConfigFetchedAt || 0);
      if (age < CONFIG_CACHE_TTL && result.teamConfig) {
        sendResponse({ teamConfig: result.teamConfig });
      } else {
        fetchTeamConfig(result.installCode).then(function(config) {
          sendResponse({ teamConfig: config || result.teamConfig || null });
        });
      }
    });
    return true;
  }

  // Report platform visit (shadow AI discovery)
  if (message.type === 'REPORT_PLATFORM_VISIT') {
    chrome.storage.local.get(['installCode'], function(result) {
      if (result.installCode && message.aiDomain) {
        reportPlatformVisit(result.installCode, message.aiDomain);
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  // Post event (detection event)
  if (message.type === 'POST_EVENT') {
    chrome.storage.local.get(['installCode'], function(result) {
      if (result.installCode && message.eventData) {
        reportEvent(result.installCode, message.eventData);
      } else if (message.debugMode) {
        console.log('[PromptFence] Event (local only):', message.eventData);
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  // Acknowledge policy
  if (message.type === 'ACKNOWLEDGE_POLICY') {
    chrome.storage.local.get(['installCode'], function(result) {
      if (!result.installCode) {
        sendResponse({ ok: false });
        return;
      }
      fetch(`${API_BASE}/api/policy/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Install-Code': result.installCode
        }
      }).then(function(res) {
        if (res.ok) {
          // Update cached team config
          chrome.storage.local.get(['teamConfig'], function(stored) {
            if (stored.teamConfig) {
              stored.teamConfig.policyAcknowledged = true;
              chrome.storage.local.set({ teamConfig: stored.teamConfig });
            }
          });
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false });
        }
      }).catch(function() {
        sendResponse({ ok: false });
      });
    });
    return true;
  }

  // Legacy messages
  if (message.type === 'FETCH_CONFIG' || message.type === 'TEST_CONFIG_FETCH') {
    sendResponse({ config: null });
    return false;
  }

  sendResponse({ ok: false, error: 'Unknown message type' });
  return false;
});
