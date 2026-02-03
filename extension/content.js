// content.js - Paste event listener and DOM interaction
// Store MVP: Local-only detection, no backend required

/**
 * ============================================================================
 * TONE OF VOICE IMPLEMENTATION
 * ============================================================================
 *
 * This file implements the tone system defined in DESIGN_NOTES.md:
 * - Calm authority: confident messaging without apology
 * - Non-assumptive: "appears to be" for patterns, direct for validated data
 * - Educational: explains why, provides alternatives
 * - User agency: always offers a path forward
 *
 * Modal copy is now pulled from PromptFencePresets and PromptFenceDataTypes
 * defined in rules.js to ensure consistency.
 * ============================================================================
 */

(function() {
  'use strict';

  const EXTENSION_VERSION = '1.0.0';

  // Local config (loaded from storage)
  let localConfig = null;
  let debugMode = false;
  let hasSeenOnboarding = false;
  let hasSeenFirstDetection = false;

  // Load config from storage
  function loadConfig() {
    // First try local storage (faster)
    chrome.storage.local.get(['localConfig'], function(result) {
      if (result.localConfig) {
        localConfig = result.localConfig;
        debugMode = localConfig.debugMode === true;
        if (debugMode) {
          console.log('[PromptFence] Loaded local config:', localConfig);
        }
      }
    });

    // Also check sync storage for settings and onboarding state
    chrome.storage.sync.get(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode', 'hasSeenOnboarding', 'hasSeenFirstDetection'], function(result) {
      hasSeenOnboarding = result.hasSeenOnboarding === true;
      hasSeenFirstDetection = result.hasSeenFirstDetection === true;

      if (result.preset || result.rules) {
        // Build config from sync storage
        const preset = result.preset || 'personal';
        const presetRules = PromptFencePresets[preset]?.rules || PromptFencePresets.personal.rules;

        localConfig = {
          preset: preset,
          rules: result.rules || presetRules,
          enableWarn: result.enableWarn !== false,
          enableBlock: result.enableBlock !== false,
          debugMode: result.debugMode === true
        };
        debugMode = localConfig.debugMode;

        if (debugMode) {
          console.log('[PromptFence] Loaded config from sync:', localConfig);
        }
      } else {
        // Use default preset if nothing saved
        localConfig = {
          preset: 'personal',
          rules: PromptFencePresets.personal.rules,
          enableWarn: true,
          enableBlock: true,
          debugMode: false
        };
      }

      // Show onboarding if first time
      if (!hasSeenOnboarding) {
        showOnboardingModal();
      }
    });
  }

  // Load config on startup
  loadConfig();

  // Listen for storage changes
  chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'local' && changes.localConfig) {
      localConfig = changes.localConfig.newValue;
      debugMode = localConfig?.debugMode === true;
      if (debugMode) {
        console.log('[PromptFence] Config updated:', localConfig);
      }
    }
    if (areaName === 'sync') {
      if (changes.hasSeenOnboarding) {
        hasSeenOnboarding = changes.hasSeenOnboarding.newValue;
      }
      if (changes.hasSeenFirstDetection) {
        hasSeenFirstDetection = changes.hasSeenFirstDetection.newValue;
      }
    }
  });

  /**
   * Gets the current rules config.
   * @returns {Object} - Rules object mapping type to action
   */
  function getRules() {
    if (localConfig && localConfig.rules) {
      return localConfig.rules;
    }
    // Fallback to default preset
    return PromptFencePresets.personal.rules;
  }

  /**
   * Determines action for detected data types based on local config.
   * @param {string[]} detectedTypes - Array of detected types
   * @returns {{action: string, types: string[]}} - action is 'BLOCK', 'WARN', or 'ALLOW'
   */
  function determineAction(detectedTypes) {
    const rules = getRules();
    const blockTypes = [];
    const warnTypes = [];

    for (const type of detectedTypes) {
      const ruleAction = rules[type];
      if (ruleAction === 'BLOCK') {
        blockTypes.push(type);
      } else if (ruleAction === 'WARN') {
        warnTypes.push(type);
      }
      // If neither BLOCK nor WARN, it's allowed
    }

    // Check if blocking/warning is enabled
    const enableBlock = localConfig?.enableBlock !== false;
    const enableWarn = localConfig?.enableWarn !== false;

    if (blockTypes.length > 0 && enableBlock) {
      return { action: 'BLOCK', types: blockTypes };
    }
    if (warnTypes.length > 0 && enableWarn) {
      return { action: 'WARN', types: warnTypes };
    }
    return { action: 'ALLOW', types: [] };
  }

  // Check if we're on a supported AI domain
  if (!isAiDomain(window.location.hostname, PromptFenceConfig.aiDomains)) {
    return;
  }

  /**
   * Checks if the target element is a likely prompt field.
   * @param {Element} target - The DOM element to check
   * @returns {boolean}
   */
  function isPromptField(target) {
    if (!target || !target.tagName) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();

    // textarea
    if (tagName === 'textarea') {
      return true;
    }

    // input type=text or type=search
    if (tagName === 'input') {
      const type = (target.type || '').toLowerCase();
      return type === 'text' || type === 'search' || type === '';
    }

    // contenteditable
    const ceAttr = target.getAttribute('contenteditable');
    if (target.isContentEditable || ceAttr === 'true' || ceAttr === '' || ceAttr === 'plaintext-only') {
      return true;
    }

    return false;
  }

  /**
   * Finds the nearest editable ancestor (or self) that is a prompt field.
   * @param {Element} el - The starting element
   * @returns {Element|null} - The editable ancestor or null
   */
  function findEditableAncestor(el) {
    let current = el;
    while (current && current !== document.documentElement) {
      if (isPromptField(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Extracts text from paste event clipboard data.
   * @param {ClipboardEvent} event
   * @returns {string}
   */
  function getPastedText(event) {
    if (event.clipboardData && event.clipboardData.getData) {
      return event.clipboardData.getData('text/plain') || '';
    }
    return '';
  }

  /**
   * Gets the current preset configuration.
   * @returns {Object} - The preset object from PromptFencePresets
   */
  function getCurrentPreset() {
    const presetId = localConfig?.preset || 'personal';
    return PromptFencePresets[presetId] || PromptFencePresets.personal;
  }

  /**
   * Gets data type information from PromptFenceDataTypes.
   * @param {string} typeId - The type ID (EMAIL, PHONE, etc.)
   * @returns {Object} - The data type definition
   */
  function getDataTypeInfo(typeId) {
    return PromptFenceDataTypes[typeId] || {
      id: typeId,
      label: typeId,
      confidence: 'pattern',
      detected: 'Detected: ' + typeId,
      risk: 'This data type may be sensitive.',
      tip: 'Consider removing or replacing this information.',
      example: '[redacted]'
    };
  }

  /**
   * Shows the first-run onboarding modal.
   * Explains what PromptFence does in under 30 seconds.
   */
  function showOnboardingModal() {
    const existingModal = document.getElementById('promptfence-modal');
    if (existingModal) return;

    const overlay = document.createElement('div');
    overlay.id = 'promptfence-modal';
    overlay.className = 'promptfence-overlay';

    const modal = document.createElement('div');
    modal.className = 'promptfence-modal promptfence-onboarding';

    modal.innerHTML = `
      <div class="promptfence-icon-welcome">🛡️</div>
      <h2 class="promptfence-title promptfence-title-welcome">Welcome to PromptFence</h2>
      <p class="promptfence-message">
        PromptFence pauses and reviews your messages before they're sent to AI tools—helping you catch sensitive data before it's shared.
      </p>
      <div class="promptfence-features">
        <div class="promptfence-feature">
          <span class="promptfence-feature-icon">🔍</span>
          <div>
            <strong>When it intervenes</strong>
            <p>Only when your text looks like it contains sensitive data—emails, phone numbers, card numbers, etc.</p>
          </div>
        </div>
        <div class="promptfence-feature">
          <span class="promptfence-feature-icon">⚙️</span>
          <div>
            <strong>How strict it is</strong>
            <p>Depends on your preset. Personal Safety is balanced; Finance and Health are stricter.</p>
          </div>
        </div>
        <div class="promptfence-feature">
          <span class="promptfence-feature-icon">🔒</span>
          <div>
            <strong>100% Local</strong>
            <p>Everything runs in your browser. Nothing is sent anywhere.</p>
          </div>
        </div>
      </div>
      <div class="promptfence-btn-group">
        <button class="promptfence-btn promptfence-btn-primary" id="promptfence-onboard-continue">Got it</button>
        <button class="promptfence-btn promptfence-btn-link" id="promptfence-onboard-settings">Open Settings</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('promptfence-onboard-continue').onclick = function() {
      chrome.storage.sync.set({ hasSeenOnboarding: true });
      hasSeenOnboarding = true;
      overlay.remove();
    };

    document.getElementById('promptfence-onboard-settings').onclick = function() {
      chrome.storage.sync.set({ hasSeenOnboarding: true });
      hasSeenOnboarding = true;
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      overlay.remove();
    };

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        chrome.storage.sync.set({ hasSeenOnboarding: true });
        hasSeenOnboarding = true;
        overlay.remove();
      }
    });
  }

  /**
   * Creates and shows the modal (WARN or BLOCK mode).
   * Uses preset-specific copy from rules.js for consistent tone.
   *
   * @param {string[]} detectedTypes - Array of detected data types
   * @param {string} action - 'WARN' or 'BLOCK'
   * @param {function} onContinue - Callback if user chooses to continue (WARN only)
   */
  function showModal(detectedTypes, action, onContinue) {
    // Remove any existing modal
    const existingModal = document.getElementById('promptfence-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const isBlock = action === 'BLOCK';
    const preset = getCurrentPreset();
    const isFinancePreset = preset.id === 'finance';

    // Get preset-specific modal copy
    const modalCopy = isBlock ? preset.modal.block : preset.modal.warn;
    const guidance = preset.guidance;

    // Mark first detection as seen
    if (!hasSeenFirstDetection) {
      chrome.storage.sync.set({ hasSeenFirstDetection: true });
      hasSeenFirstDetection = true;
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'promptfence-modal';
    overlay.className = 'promptfence-overlay';

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'promptfence-modal' + (isBlock ? ' promptfence-modal-block' : ' promptfence-modal-warn');
    if (isFinancePreset && isBlock) {
      modal.classList.add('promptfence-modal-finance');
    }

    // Icon - informational, not alarming
    const icon = document.createElement('div');
    icon.className = 'promptfence-modal-icon';
    icon.textContent = isBlock ? '⏸️' : '💡';

    // Title - from preset copy
    const title = document.createElement('h2');
    title.className = 'promptfence-title';
    title.textContent = modalCopy.title;

    // Message - from preset copy
    const message = document.createElement('p');
    message.className = 'promptfence-message';
    message.textContent = modalCopy.body;

    // Detected types list with data type info from rules.js
    const typesList = document.createElement('div');
    typesList.className = 'promptfence-types';

    detectedTypes.forEach(function(typeId) {
      const typeInfo = getDataTypeInfo(typeId);
      const typeItem = document.createElement('div');
      typeItem.className = 'promptfence-type-item';

      typeItem.innerHTML = `
        <div class="promptfence-type-header">
          <strong>${typeInfo.label}</strong>
        </div>
        <div class="promptfence-type-risk">${typeInfo.risk}</div>
        <div class="promptfence-type-tip">
          <span class="promptfence-tip-label">Tip:</span> ${typeInfo.tip}
        </div>
      `;
      typesList.appendChild(typeItem);
    });

    // Preset-specific guidance
    const guidanceBox = document.createElement('div');
    guidanceBox.className = 'promptfence-guidance';
    guidanceBox.innerHTML = `
      <p>${guidance.message}</p>
      <p class="promptfence-guidance-emphasis">${guidance.emphasis}</p>
    `;

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'promptfence-btn-group';

    // Primary action: Edit message (always available)
    const editBtn = document.createElement('button');
    editBtn.className = 'promptfence-btn promptfence-btn-primary';
    editBtn.textContent = 'Edit message';
    editBtn.onclick = function() {
      overlay.remove();
    };
    btnContainer.appendChild(editBtn);

    if (!isBlock) {
      // Secondary action (WARN only): Continue anyway
      const continueBtn = document.createElement('button');
      continueBtn.className = 'promptfence-btn promptfence-btn-muted';
      continueBtn.textContent = 'Continue anyway';
      continueBtn.onclick = function() {
        overlay.remove();
        if (typeof onContinue === 'function') {
          onContinue();
        }
      };
      btnContainer.appendChild(continueBtn);
    }

    // Settings link (always available)
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'promptfence-btn promptfence-btn-link';
    settingsBtn.textContent = 'Settings';
    settingsBtn.onclick = function() {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      overlay.remove();
    };
    btnContainer.appendChild(settingsBtn);

    // Assemble modal
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(typesList);
    modal.appendChild(guidanceBox);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);

    // Add to page
    document.body.appendChild(overlay);

    // Focus primary button for accessibility
    editBtn.focus();

    // Close on Escape key
    function handleEscape(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    }
    document.addEventListener('keydown', handleEscape);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  /**
   * Paste event handler.
   * @param {ClipboardEvent} event
   */
  function handlePaste(event) {
    // Find the editable target
    let target = document.activeElement || event.target;
    target = findEditableAncestor(target);

    // Only intercept if target is a prompt field
    if (!target) {
      return;
    }

    // Get pasted text
    const text = getPastedText(event);
    if (!text) {
      return;
    }

    // Detect sensitive data (using all enabled types)
    const hits = detectMatches(text);
    if (hits.length === 0) {
      return;
    }

    // Determine action based on local config
    const { action, types } = determineAction(hits);

    if (action === 'ALLOW') {
      return;
    }

    if (action === 'BLOCK') {
      // Block the paste
      event.preventDefault();
      event.stopPropagation();

      // Show BLOCK modal
      showModal(types, 'BLOCK');

      console.log('[PromptFence] Blocked paste containing:', types.join(', '));
      if (debugMode) {
        console.log('[PromptFence DEBUG] Blocked text preview:', text.substring(0, 200));
      }
    } else if (action === 'WARN') {
      // Allow paste but show warning
      showModal(types, 'WARN');

      console.log('[PromptFence] Warning for paste containing:', types.join(', '));
      if (debugMode) {
        console.log('[PromptFence DEBUG] Warned text preview:', text.substring(0, 200));
      }
    }
  }

  // Attach paste listener in capture phase
  document.addEventListener('paste', handlePaste, true);

  console.log('[PromptFence] Active on', window.location.hostname);
})();
