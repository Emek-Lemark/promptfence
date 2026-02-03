// service_worker.js - Config fetch, event posting, userHash management

const DEFAULT_API_BASE = 'http://localhost:3000';
const FETCH_TIMEOUT_MS = 3000;

/**
 * Gets the configured API base URL.
 * @returns {Promise<string>}
 */
async function getApiBase() {
  const result = await chrome.storage.local.get(['apiBase']);
  return result.apiBase || DEFAULT_API_BASE;
}

/**
 * Generates or retrieves a stable user hash.
 * @returns {Promise<string>}
 */
async function getUserHash() {
  const result = await chrome.storage.local.get(['userHash']);
  if (result.userHash) {
    return result.userHash;
  }
  const hash = crypto.randomUUID();
  await chrome.storage.local.set({ userHash: hash });
  return hash;
}

/**
 * Fetch with timeout.
 * @param {string} url
 * @param {object} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches org config from backend and caches it.
 * @returns {Promise<Object|null>}
 */
async function fetchAndCacheConfig() {
  const result = await chrome.storage.local.get(['installCode']);
  if (!result.installCode) {
    console.log('[PromptFence] No install code configured');
    await chrome.storage.local.set({
      configFetchStatus: 'error',
      configFetchMessage: 'No install code configured',
      configFetchedAt: new Date().toISOString()
    });
    return null;
  }

  const apiBase = await getApiBase();
  const userHash = await getUserHash();

  try {
    const response = await fetchWithTimeout(
      `${apiBase}/api/config`,
      {
        method: 'GET',
        headers: {
          'X-Install-Code': result.installCode,
          'X-User-Hash': userHash
        }
      },
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      console.warn('[PromptFence] Config fetch failed:', response.status);
      await chrome.storage.local.set({
        configFetchStatus: 'error',
        configFetchMessage: `HTTP ${response.status}`,
        configFetchedAt: new Date().toISOString()
      });
      return null;
    }

    const config = await response.json();
    await chrome.storage.local.set({
      orgConfig: config,
      configFetchStatus: 'ok',
      configFetchMessage: 'OK',
      configFetchedAt: new Date().toISOString()
    });
    console.log('[PromptFence] Config fetched and cached');
    return config;
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Timeout' : err.message;
    console.warn('[PromptFence] Config fetch error:', message);
    await chrome.storage.local.set({
      configFetchStatus: 'error',
      configFetchMessage: message,
      configFetchedAt: new Date().toISOString()
    });
    return null;
  }
}

/**
 * Posts an event to the backend.
 * @param {Object} eventData
 */
async function postEvent(eventData) {
  const result = await chrome.storage.local.get(['installCode']);
  if (!result.installCode) {
    console.log('[PromptFence] No install code, skipping event post');
    return;
  }

  const apiBase = await getApiBase();
  const userHash = await getUserHash();

  try {
    const response = await fetchWithTimeout(
      `${apiBase}/api/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Install-Code': result.installCode,
          'X-User-Hash': userHash
        },
        body: JSON.stringify(eventData)
      },
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      console.warn('[PromptFence] Event post failed:', response.status);
    } else {
      console.log('[PromptFence] Event posted');
    }
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Timeout' : err.message;
    console.warn('[PromptFence] Event post error:', message);
  }
}

// Fetch config on extension install/update
chrome.runtime.onInstalled.addListener(function() {
  console.log('[PromptFence] Extension installed');
  fetchAndCacheConfig();
});

// Fetch config on browser startup
chrome.runtime.onStartup.addListener(function() {
  console.log('[PromptFence] Browser startup');
  fetchAndCacheConfig();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'FETCH_CONFIG') {
    fetchAndCacheConfig().then(function(config) {
      sendResponse({ config: config });
    });
    return true; // async response
  }

  if (message.type === 'POST_EVENT') {
    postEvent(message.eventData);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'TEST_CONFIG_FETCH') {
    fetchAndCacheConfig().then(function(config) {
      sendResponse({ success: !!config });
    });
    return true; // async response
  }
});
