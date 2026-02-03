// options.js - Settings page for PromptFence (Personal)
// Store MVP: Local mode with presets, no backend required

(function() {
  'use strict';

  const presetSelect = document.getElementById('preset');
  const presetDescription = document.getElementById('presetDescription');
  const rulesPreview = document.getElementById('rulesPreview');
  const enableWarnToggle = document.getElementById('enableWarn');
  const enableBlockToggle = document.getElementById('enableBlock');
  const debugModeToggle = document.getElementById('debugMode');
  const saveBtn = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Type display names
  const typeNames = {
    EMAIL: 'Email Address',
    PHONE: 'Phone Number',
    IBAN: 'Bank Account (IBAN)',
    CREDIT_CARD: 'Credit Card',
    ADDRESS: 'Physical Address',
    PASSWORD: 'Password/API Key'
  };

  // Update preset description and rules preview
  function updatePresetUI(presetId) {
    const preset = PromptFencePresets[presetId];
    if (!preset) return;

    presetDescription.textContent = preset.description;

    // Update rules preview
    let html = '<h4>Current Rules</h4>';
    for (const [type, action] of Object.entries(preset.rules)) {
      const actionClass = action.toLowerCase();
      const typeName = typeNames[type] || type;
      html += `<div class="rule-item">
        <span>${typeName}</span>
        <span class="rule-action ${actionClass}">${action}</span>
      </div>`;
    }
    rulesPreview.innerHTML = html;
  }

  // Load existing settings on page load
  // Use chrome.storage.sync for cross-device sync
  chrome.storage.sync.get(
    ['preset', 'enableWarn', 'enableBlock', 'debugMode'],
    function(result) {
      // Set preset
      const preset = result.preset || 'personal';
      presetSelect.value = preset;
      updatePresetUI(preset);

      // Set toggles (default to true for warn/block)
      enableWarnToggle.checked = result.enableWarn !== false;
      enableBlockToggle.checked = result.enableBlock !== false;
      debugModeToggle.checked = result.debugMode === true;
    }
  );

  // Update UI when preset changes
  presetSelect.addEventListener('change', function() {
    updatePresetUI(presetSelect.value);
  });

  // Save settings
  saveBtn.addEventListener('click', function() {
    const settings = {
      preset: presetSelect.value,
      enableWarn: enableWarnToggle.checked,
      enableBlock: enableBlockToggle.checked,
      debugMode: debugModeToggle.checked
    };

    // Also store the current rules for easy access by content script
    const preset = PromptFencePresets[settings.preset];
    if (preset) {
      settings.rules = preset.rules;
    }

    chrome.storage.sync.set(settings, function() {
      statusDiv.textContent = 'Settings saved!';
      statusDiv.className = '';

      // Also update local storage for faster access by content script
      chrome.storage.local.set({
        localConfig: {
          preset: settings.preset,
          rules: settings.rules,
          enableWarn: settings.enableWarn,
          enableBlock: settings.enableBlock,
          debugMode: settings.debugMode
        }
      });

      // Clear status after 2 seconds
      setTimeout(function() {
        statusDiv.textContent = '';
      }, 2000);
    });
  });

  // Initial UI update
  updatePresetUI(presetSelect.value);
})();
