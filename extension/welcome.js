/**
 * Welcome page event handlers
 * External script to comply with Chrome MV3 CSP (no inline scripts)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Open Settings button
  const openSettingsBtn = document.getElementById('open-settings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', function() {
      try {
        if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          // Fallback: send message to service worker
          chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }, function(response) {
            // If message fails, navigate directly
            if (chrome.runtime.lastError) {
              window.location.href = 'options.html';
            }
          });
        }
      } catch (e) {
        // Final fallback: direct navigation
        window.location.href = 'options.html';
      }
    });
  }
});
