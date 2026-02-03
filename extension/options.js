// options.js - Settings page for install code and API base URL

(function() {
  'use strict';

  const installCodeInput = document.getElementById('installCode');
  const apiBaseInput = document.getElementById('apiBase');
  const saveBtn = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  const configStatusSpan = document.getElementById('configStatus');
  const configTimestampSpan = document.getElementById('configTimestamp');

  // Load existing settings and status on page load
  chrome.storage.local.get(
    ['installCode', 'apiBase', 'configFetchStatus', 'configFetchMessage', 'configFetchedAt'],
    function(result) {
      if (result.installCode) {
        installCodeInput.value = result.installCode;
      }
      if (result.apiBase) {
        apiBaseInput.value = result.apiBase;
      }
      updateConfigStatus(result);
    }
  );

  // Listen for storage changes to update status in real-time
  chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'local') {
      chrome.storage.local.get(
        ['configFetchStatus', 'configFetchMessage', 'configFetchedAt'],
        function(result) {
          updateConfigStatus(result);
        }
      );
    }
  });

  function updateConfigStatus(result) {
    if (result.configFetchStatus === 'ok') {
      configStatusSpan.textContent = 'OK';
      configStatusSpan.className = 'status-value ok';
    } else if (result.configFetchStatus === 'error') {
      configStatusSpan.textContent = 'Failed' + (result.configFetchMessage ? ' (' + result.configFetchMessage + ')' : '');
      configStatusSpan.className = 'status-value error';
    } else {
      configStatusSpan.textContent = '-';
      configStatusSpan.className = 'status-value';
    }

    if (result.configFetchedAt) {
      const date = new Date(result.configFetchedAt);
      configTimestampSpan.textContent = date.toLocaleString();
    } else {
      configTimestampSpan.textContent = '-';
    }
  }

  function isValidUrl(urlString) {
    if (!urlString) return true; // Empty is valid (will use default)
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  // Save settings
  saveBtn.addEventListener('click', function() {
    const code = installCodeInput.value.trim().toUpperCase();
    const apiBase = apiBaseInput.value.trim();

    // Validate install code
    if (!code) {
      statusDiv.textContent = 'Please enter an install code.';
      statusDiv.className = 'error';
      return;
    }

    if (!/^[A-Z0-9]{8}$/.test(code)) {
      statusDiv.textContent = 'Install code must be 8 alphanumeric characters.';
      statusDiv.className = 'error';
      return;
    }

    // Validate API base URL
    if (apiBase && !isValidUrl(apiBase)) {
      statusDiv.textContent = 'API Base URL must start with http:// or https://';
      statusDiv.className = 'error';
      return;
    }

    // Remove trailing slash from API base if present
    const cleanApiBase = apiBase.replace(/\/+$/, '');

    const settings = { installCode: code };
    if (cleanApiBase) {
      settings.apiBase = cleanApiBase;
    } else {
      // Clear apiBase if empty to use default
      chrome.storage.local.remove('apiBase');
    }

    chrome.storage.local.set(settings, function() {
      statusDiv.textContent = 'Saved! Fetching config...';
      statusDiv.className = '';

      // Trigger config fetch
      chrome.runtime.sendMessage({ type: 'TEST_CONFIG_FETCH' }, function(response) {
        if (response && response.success) {
          statusDiv.textContent = 'Saved! Config fetched successfully.';
          statusDiv.className = '';
        } else {
          statusDiv.textContent = 'Saved! Config fetch failed - check status below.';
          statusDiv.className = 'error';
        }
      });
    });
  });
})();
