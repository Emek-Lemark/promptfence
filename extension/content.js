// content.js - Paste event listener and DOM interaction
// Store MVP: Local-only detection, no backend required

(function() {
  'use strict';

  const EXTENSION_VERSION = '1.0.0';

  // Local config (loaded from storage)
  let localConfig = null;
  let debugMode = false;

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

    // Also check sync storage for settings
    chrome.storage.sync.get(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode'], function(result) {
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
   * Creates and shows the modal (WARN or BLOCK mode).
   * @param {string[]} detectedTypes - Array of detected data types
   * @param {string} action - 'WARN' or 'BLOCK'
   */
  function showModal(detectedTypes, action) {
    // Remove any existing modal
    const existingModal = document.getElementById('promptfence-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const isBlock = action === 'BLOCK';

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'promptfence-modal';
    overlay.className = 'promptfence-overlay';

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'promptfence-modal';

    // Title
    const title = document.createElement('h2');
    title.className = 'promptfence-title';
    title.textContent = isBlock ? 'Paste Blocked' : 'Sensitive Data Warning';
    if (!isBlock) {
      title.style.color = '#f59e0b';
    }

    // Message
    const message = document.createElement('p');
    message.className = 'promptfence-message';
    message.textContent = isBlock
      ? 'The pasted content contains sensitive data that should not be shared with AI assistants:'
      : 'The pasted content contains sensitive data. Please review before sharing:';

    // Detected types list with explanations
    const typesList = document.createElement('ul');
    typesList.className = 'promptfence-types';
    detectedTypes.forEach(function(type) {
      const li = document.createElement('li');
      const typeName = typeof getTypeName === 'function' ? getTypeName(type) : type;
      const explanation = typeof getTypeExplanation === 'function' ? getTypeExplanation(type) : '';
      li.innerHTML = `<strong>${typeName}</strong>`;
      if (explanation) {
        const hint = document.createElement('div');
        hint.style.fontSize = '12px';
        hint.style.color = '#6b7280';
        hint.style.marginTop = '2px';
        hint.textContent = explanation;
        li.appendChild(hint);
      }
      typesList.appendChild(li);
    });

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.marginTop = '16px';

    // Close/OK button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'promptfence-close';
    closeBtn.textContent = isBlock ? 'OK' : 'I Understand';
    closeBtn.onclick = function() {
      overlay.remove();
    };
    btnContainer.appendChild(closeBtn);

    // Assemble modal
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(typesList);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);

    // Add to page
    document.body.appendChild(overlay);

    // Focus close button for accessibility
    closeBtn.focus();

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
