// content.js - Paste event listener and DOM interaction
// Intercepts paste events on AI chat prompt fields

(function() {
  'use strict';

  const EXTENSION_VERSION = '1.0.0';

  // Org config from backend (loaded async)
  let orgConfig = null;

  // Load cached config from storage
  chrome.storage.local.get(['orgConfig'], function(result) {
    if (result.orgConfig) {
      orgConfig = result.orgConfig;
      console.log('[PromptFence] Loaded cached config');
    }
  });

  // Request fresh config fetch from service worker
  chrome.runtime.sendMessage({ type: 'FETCH_CONFIG' }, function(response) {
    if (response && response.config) {
      orgConfig = response.config;
      console.log('[PromptFence] Config updated from backend');
    }
  });

  /**
   * Determines action for detected data types based on org config rules.
   * @param {string[]} detectedTypes - Array of detected types (EMAIL, PHONE, IBAN)
   * @returns {{action: string, types: string[]}} - action is 'BLOCK', 'WARN', or 'ALLOW'
   */
  function determineAction(detectedTypes) {
    if (!orgConfig || !orgConfig.rules) {
      // Fallback to local rules (all BLOCK)
      return { action: 'BLOCK', types: detectedTypes };
    }

    const blockTypes = [];
    const warnTypes = [];

    for (const type of detectedTypes) {
      const ruleAction = orgConfig.rules[type];
      if (ruleAction === 'BLOCK') {
        blockTypes.push(type);
      } else if (ruleAction === 'WARN') {
        warnTypes.push(type);
      }
      // If neither BLOCK nor WARN, it's allowed
    }

    if (blockTypes.length > 0) {
      return { action: 'BLOCK', types: blockTypes };
    }
    if (warnTypes.length > 0) {
      return { action: 'WARN', types: warnTypes };
    }
    return { action: 'ALLOW', types: [] };
  }

  /**
   * Posts an event to the backend via service worker.
   * @param {string} action - 'WARN' or 'BLOCK'
   * @param {string[]} dataTypes - Detected data types
   */
  function postEvent(action, dataTypes) {
    const eventData = {
      timestamp: new Date().toISOString(),
      aiDomain: window.location.hostname,
      ruleId: 'R1',
      dataTypes: dataTypes,
      action: action,
      extensionVersion: EXTENSION_VERSION
    };

    chrome.runtime.sendMessage({ type: 'POST_EVENT', eventData: eventData });
  }

  // Check if we're on a supported AI domain (initial check with local rules)
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

    // contenteditable (true, '', or plaintext-only are all editable)
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
      title.style.color = '#f59e0b'; // amber for warning
    }

    // Message
    const message = document.createElement('p');
    message.className = 'promptfence-message';
    message.textContent = isBlock
      ? 'The pasted content contains sensitive data that cannot be shared with AI assistants:'
      : 'The pasted content contains sensitive data. Please review before sharing:';

    // Detected types list
    const typesList = document.createElement('ul');
    typesList.className = 'promptfence-types';
    detectedTypes.forEach(function(type) {
      const li = document.createElement('li');
      li.textContent = formatTypeName(type);
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

    // "Use approved AI" button if approvedAiUrl is set
    if (orgConfig && orgConfig.approvedAiUrl) {
      const approvedBtn = document.createElement('button');
      approvedBtn.className = 'promptfence-close';
      approvedBtn.style.background = '#22c55e';
      approvedBtn.textContent = 'Use Approved AI';
      approvedBtn.onclick = function() {
        window.open(orgConfig.approvedAiUrl, '_blank');
        overlay.remove();
      };
      btnContainer.appendChild(approvedBtn);
    }

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
   * Formats a type identifier for display.
   * @param {string} type
   * @returns {string}
   */
  function formatTypeName(type) {
    switch (type) {
      case 'EMAIL': return 'Email Address';
      case 'PHONE': return 'Phone Number';
      case 'IBAN': return 'Bank Account (IBAN)';
      default: return type;
    }
  }

  /**
   * Paste event handler.
   * @param {ClipboardEvent} event
   */
  function handlePaste(event) {
    // Find the editable target: prefer activeElement, fallback to event.target
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

    // Detect sensitive data
    const hits = detectMatches(text);
    if (hits.length === 0) {
      return;
    }

    // Determine action based on org config (or fallback to local rules)
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

      // Post event to backend
      postEvent('BLOCK', types);

      console.log('[PromptFence] Blocked paste containing:', types.join(', '));
    } else if (action === 'WARN') {
      // Allow paste but show warning
      showModal(types, 'WARN');

      // Post event to backend
      postEvent('WARN', types);

      console.log('[PromptFence] Warning for paste containing:', types.join(', '));
    }
  }

  // Attach paste listener in capture phase to intercept before page handlers
  document.addEventListener('paste', handlePaste, true);

  console.log('[PromptFence] Active on', window.location.hostname);
})();
