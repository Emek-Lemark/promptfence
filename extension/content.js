// content.js - Paste event listener and DOM interaction
// Intercepts paste events on AI chat prompt fields

(function() {
  'use strict';

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
   * Creates and shows the blocking modal.
   * @param {string[]} detectedTypes - Array of detected data types
   * @param {Object} rule - The triggered rule
   */
  function showBlockModal(detectedTypes, rule) {
    // Remove any existing modal
    const existingModal = document.getElementById('promptfence-modal');
    if (existingModal) {
      existingModal.remove();
    }

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
    title.textContent = 'Paste Blocked';

    // Message
    const message = document.createElement('p');
    message.className = 'promptfence-message';
    message.textContent = 'The pasted content contains sensitive data that cannot be shared with AI assistants:';

    // Detected types list
    const typesList = document.createElement('ul');
    typesList.className = 'promptfence-types';
    detectedTypes.forEach(function(type) {
      const li = document.createElement('li');
      li.textContent = formatTypeName(type);
      typesList.appendChild(li);
    });

    // Rule info
    const ruleInfo = document.createElement('p');
    ruleInfo.className = 'promptfence-rule';
    ruleInfo.textContent = 'Rule: ' + rule.name;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'promptfence-close';
    closeBtn.textContent = 'OK';
    closeBtn.onclick = function() {
      overlay.remove();
    };

    // Assemble modal
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(typesList);
    modal.appendChild(ruleInfo);
    modal.appendChild(closeBtn);
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

    // Check if any rule is triggered
    const triggeredRule = ruleTriggers(hits, PromptFenceConfig.rules);
    if (!triggeredRule || triggeredRule.action !== 'BLOCK') {
      return;
    }

    // Block the paste
    event.preventDefault();
    event.stopPropagation();

    // Show modal
    showBlockModal(hits, triggeredRule);

    // Log to console
    console.log('[PromptFence] Blocked paste containing:', hits.join(', '));
    console.log('[PromptFence] Triggered rule:', triggeredRule.id, '-', triggeredRule.name);
  }

  // Attach paste listener in capture phase to intercept before page handlers
  document.addEventListener('paste', handlePaste, true);

  console.log('[PromptFence] Active on', window.location.hostname);
})();
