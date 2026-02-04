// content.js - Centered modal with one-click anonymization
// Store MVP: Local-only detection, no backend required

(function() {
  'use strict';

  // ============================================================================
  // SAFE EXTENSION API WRAPPERS
  // ============================================================================
  // These wrappers prevent crashes when the extension context is invalidated
  // (e.g., after extension reload/update/disable while page is open)

  let disabledDueToRuntime = false;
  let onboardingTimeoutId = null;

  /**
   * Checks if the extension runtime is available and not invalidated.
   * @returns {boolean}
   */
  function isExtensionRuntimeAvailable() {
    try {
      // Check if chrome and runtime exist
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return false;
      }
      // Accessing chrome.runtime.id throws if context is invalidated
      const id = chrome.runtime.id;
      return typeof id === 'string' && id.length > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safely sends a message to the service worker.
   * Returns a promise that resolves to true on success, false on failure.
   * Never throws.
   * @param {Object} message
   * @returns {Promise<boolean>}
   */
  function safeSendMessage(message) {
    return new Promise((resolve) => {
      if (!isExtensionRuntimeAvailable()) {
        resolve(false);
        return;
      }
      try {
        chrome.runtime.sendMessage(message, function(response) {
          // Check for runtime errors (happens if context invalidated during call)
          if (chrome.runtime.lastError) {
            if (debugMode) {
              console.log('[PromptFence] sendMessage error:', chrome.runtime.lastError.message);
            }
            resolve(false);
            return;
          }
          resolve(true);
        });
      } catch (e) {
        if (debugMode) {
          console.log('[PromptFence] sendMessage exception:', e.message);
        }
        resolve(false);
      }
    });
  }

  /**
   * Safely opens the options page.
   * Sends message to service worker; if that fails, does nothing (no crash).
   */
  function safeOpenOptionsPage() {
    safeSendMessage({ type: 'OPEN_OPTIONS' }).then(function(success) {
      if (!success && debugMode) {
        console.log('[PromptFence] Could not open options page (extension context unavailable)');
      }
    });
  }

  /**
   * Safely gets values from chrome.storage.
   * @param {string[]} keys
   * @param {string} area - 'sync' or 'local'
   * @returns {Promise<Object>}
   */
  function safeStorageGet(keys, area) {
    area = area || 'sync';
    return new Promise((resolve) => {
      if (!isExtensionRuntimeAvailable()) {
        resolve({});
        return;
      }
      try {
        const storage = area === 'local' ? chrome.storage.local : chrome.storage.sync;
        storage.get(keys, function(result) {
          if (chrome.runtime.lastError) {
            if (debugMode) {
              console.log('[PromptFence] storage.get error:', chrome.runtime.lastError.message);
            }
            resolve({});
            return;
          }
          resolve(result || {});
        });
      } catch (e) {
        if (debugMode) {
          console.log('[PromptFence] storage.get exception:', e.message);
        }
        resolve({});
      }
    });
  }

  /**
   * Safely sets values in chrome.storage.
   * @param {Object} obj
   * @param {string} area - 'sync' or 'local'
   * @returns {Promise<void>}
   */
  function safeStorageSet(obj, area) {
    area = area || 'sync';
    return new Promise((resolve) => {
      if (!isExtensionRuntimeAvailable()) {
        resolve();
        return;
      }
      try {
        const storage = area === 'local' ? chrome.storage.local : chrome.storage.sync;
        storage.set(obj, function() {
          if (chrome.runtime.lastError) {
            if (debugMode) {
              console.log('[PromptFence] storage.set error:', chrome.runtime.lastError.message);
            }
          }
          resolve();
        });
      } catch (e) {
        if (debugMode) {
          console.log('[PromptFence] storage.set exception:', e.message);
        }
        resolve();
      }
    });
  }

  /**
   * Safely adds a listener to chrome.storage.onChanged.
   * Returns a function to remove the listener, or null if failed.
   */
  function safeAddStorageListener(callback) {
    if (!isExtensionRuntimeAvailable()) {
      return null;
    }
    try {
      chrome.storage.onChanged.addListener(callback);
      return function() {
        try {
          chrome.storage.onChanged.removeListener(callback);
        } catch (e) {
          // Ignore - context may be invalidated
        }
      };
    } catch (e) {
      return null;
    }
  }

  // ============================================================================
  // GLOBAL ERROR HANDLERS FOR EXTENSION CONTEXT INVALIDATION
  // ============================================================================

  /**
   * Checks if an error is caused by extension context invalidation.
   * @param {string} message
   * @returns {boolean}
   */
  function isExtensionContextError(message) {
    if (!message || typeof message !== 'string') return false;
    const patterns = [
      'Extension context invalidated',
      'Cannot read properties of undefined',
      'Cannot read property',
      'sendMessage',
      'The message port closed before a response was received',
      'chrome.runtime'
    ];
    const lowerMessage = message.toLowerCase();
    return patterns.some(function(p) {
      return lowerMessage.includes(p.toLowerCase());
    });
  }

  /**
   * Handles extension context invalidation by tearing down PromptFence.
   */
  function handleContextInvalidation() {
    if (disabledDueToRuntime) return;
    disabledDueToRuntime = true;
    console.log('[PromptFence] Extension context invalidated - disabling gracefully');
    teardown();
  }

  // Catch unhandled promise rejections related to extension context
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && isExtensionContextError(String(event.reason.message || event.reason))) {
      event.preventDefault();
      handleContextInvalidation();
    }
  });

  // Catch synchronous errors related to extension context
  window.addEventListener('error', function(event) {
    if (event.message && isExtensionContextError(event.message)) {
      event.preventDefault();
      handleContextInvalidation();
    }
  });

  // ============================================================================
  // STATE
  // ============================================================================
  let localConfig = null;
  let debugMode = false;
  let hasSeenOnboarding = false;
  let shadowHost = null;
  let shadowRoot = null;
  let lastFocusedElement = null;
  let pendingText = null;
  let pendingMatches = null;
  let pendingTarget = null;
  let pasteHandlerAttached = false;
  let removeStorageListener = null;

  // ============================================================================
  // TEARDOWN - Idempotent cleanup
  // ============================================================================

  /**
   * Safely tears down all PromptFence UI and listeners.
   * Can be called multiple times without throwing.
   */
  function teardown() {
    try {
      // Clear any pending onboarding timeout
      if (onboardingTimeoutId) {
        clearTimeout(onboardingTimeoutId);
        onboardingTimeoutId = null;
      }

      // Remove modal/backdrop from shadow root
      if (shadowRoot) {
        try {
          const backdrop = shadowRoot.querySelector('.pf-backdrop');
          const modal = shadowRoot.querySelector('.pf-modal');
          if (backdrop) backdrop.remove();
          if (modal) modal.remove();
        } catch (e) {
          // Ignore
        }
      }

      // Remove shadow host from document
      if (shadowHost && shadowHost.parentNode) {
        try {
          shadowHost.parentNode.removeChild(shadowHost);
        } catch (e) {
          // Ignore
        }
      }
      shadowHost = null;
      shadowRoot = null;

      // Clear pending state
      pendingText = null;
      pendingMatches = null;
      pendingTarget = null;
      lastFocusedElement = null;

      // Remove paste handler
      if (pasteHandlerAttached) {
        try {
          document.removeEventListener('paste', handlePaste, true);
        } catch (e) {
          // Ignore
        }
        pasteHandlerAttached = false;
      }

      // Remove storage listener
      if (removeStorageListener) {
        try {
          removeStorageListener();
        } catch (e) {
          // Ignore
        }
        removeStorageListener = null;
      }
    } catch (e) {
      // Teardown must never throw
      console.log('[PromptFence] Teardown error (ignored):', e.message);
    }
  }

  /**
   * Safely closes the modal and restores focus.
   * Never throws.
   */
  function closeModalSafely() {
    try {
      clearModal();
    } catch (e) {
      // Ignore
    }
    try {
      restoreFocus();
    } catch (e) {
      // Ignore
    }
  }

  // ============================================================================
  // MODAL STYLES (Shadow DOM isolated)
  // ============================================================================
  const MODAL_STYLES = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      --pf-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --pf-bg: #ffffff;
      --pf-surface: #f8fafc;
      --pf-border: #e2e8f0;
      --pf-text: #1e293b;
      --pf-text-secondary: #475569;
      --pf-text-muted: #64748b;
      --pf-accent: #2563eb;
      --pf-accent-hover: #1d4ed8;
      /* WARN: soft amber */
      --pf-warn-bg: #fffbeb;
      --pf-warn-border: #fde68a;
      --pf-warn-accent: #d97706;
      /* BLOCK: muted danger (rust/clay) */
      --pf-block-bg: #fef7f5;
      --pf-block-border: #e8c4bc;
      --pf-block-accent: #9a4a36;
      /* FINANCE: stronger danger red */
      --pf-finance-bg: #fef2f2;
      --pf-finance-border: #fecaca;
      --pf-finance-accent: #dc2626;
      --pf-radius: 20px;
      --pf-radius-sm: 8px;
      --pf-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
      --pf-overlay: rgba(15, 23, 42, 0.4);
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --pf-bg: #1e293b;
        --pf-surface: #334155;
        --pf-border: #475569;
        --pf-text: #f1f5f9;
        --pf-text-secondary: #cbd5e1;
        --pf-text-muted: #94a3b8;
        /* WARN dark */
        --pf-warn-bg: #422006;
        --pf-warn-border: #78350f;
        --pf-warn-accent: #fbbf24;
        /* BLOCK dark: muted rust */
        --pf-block-bg: #3d2a24;
        --pf-block-border: #5c3d32;
        --pf-block-accent: #d4a494;
        /* FINANCE dark */
        --pf-finance-bg: #450a0a;
        --pf-finance-border: #7f1d1d;
        --pf-finance-accent: #f87171;
        --pf-shadow: 0 8px 32px rgba(0,0,0,0.4);
        --pf-overlay: rgba(0, 0, 0, 0.6);
      }
    }

    /* Backdrop overlay */
    .pf-backdrop {
      position: fixed;
      inset: 0;
      background: var(--pf-overlay);
      z-index: 2147483646;
      animation: pf-fade-in 0.15s ease-out;
    }

    @keyframes pf-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Centered modal card */
    .pf-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 480px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 64px);
      background: var(--pf-bg);
      border-radius: var(--pf-radius);
      box-shadow: var(--pf-shadow);
      font-family: var(--pf-font);
      z-index: 2147483647;
      animation: pf-scale-in 0.2s ease-out;
      overflow: hidden;
    }

    @media (max-width: 520px) {
      .pf-modal {
        width: auto;
        left: 16px;
        right: 16px;
        transform: translateY(-50%);
      }
    }

    @keyframes pf-scale-in {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    .pf-modal--warn {
      border: 1.5px solid var(--pf-warn-border);
    }

    .pf-modal--block {
      border: 1.5px solid var(--pf-block-border);
    }

    .pf-modal--finance {
      border: 1.5px solid var(--pf-finance-border);
    }

    .pf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--pf-border);
    }

    .pf-modal--warn .pf-header {
      background: var(--pf-warn-bg);
      border-color: var(--pf-warn-border);
    }

    .pf-modal--block .pf-header {
      background: var(--pf-block-bg);
      border-color: var(--pf-block-border);
    }

    .pf-modal--finance .pf-header {
      background: var(--pf-finance-bg);
      border-color: var(--pf-finance-border);
    }

    .pf-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pf-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .pf-icon svg {
      width: 100%;
      height: 100%;
    }

    .pf-modal--warn .pf-icon { color: var(--pf-warn-accent); }
    .pf-modal--block .pf-icon { color: var(--pf-block-accent); }
    .pf-modal--finance .pf-icon { color: var(--pf-finance-accent); }

    .pf-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--pf-text);
    }

    .pf-close {
      background: none;
      border: none;
      padding: 6px;
      cursor: pointer;
      color: var(--pf-text-muted);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pf-close:hover {
      background: var(--pf-surface);
      color: var(--pf-text);
    }

    .pf-close svg {
      width: 18px;
      height: 18px;
    }

    .pf-body {
      padding: 16px 20px 20px;
    }

    .pf-subtitle {
      font-size: 13px;
      color: var(--pf-text-secondary);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .pf-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }

    .pf-chip {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      background: var(--pf-surface);
      border: 1px solid var(--pf-border);
      border-radius: 14px;
      font-size: 12px;
      color: var(--pf-text-secondary);
    }

    .pf-modal--warn .pf-chip {
      background: var(--pf-warn-bg);
      border-color: var(--pf-warn-border);
    }

    .pf-modal--block .pf-chip {
      background: var(--pf-block-bg);
      border-color: var(--pf-block-border);
    }

    .pf-modal--finance .pf-chip {
      background: var(--pf-finance-bg);
      border-color: var(--pf-finance-border);
    }

    .pf-guidance {
      font-size: 12px;
      color: var(--pf-text-muted);
      margin-bottom: 16px;
    }

    /* Button row: right-aligned, single horizontal row */
    .pf-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .pf-btn {
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 9px 16px;
      border-radius: var(--pf-radius-sm);
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    .pf-btn:focus {
      outline: 2px solid var(--pf-accent);
      outline-offset: 2px;
    }

    .pf-btn--primary {
      background: var(--pf-accent);
      color: #fff;
    }

    .pf-btn--primary:hover {
      background: var(--pf-accent-hover);
    }

    .pf-btn--secondary {
      background: var(--pf-surface);
      color: var(--pf-text-secondary);
      border: 1px solid var(--pf-border);
    }

    .pf-btn--secondary:hover {
      background: var(--pf-border);
    }

    .pf-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0 20px 16px;
    }

    .pf-link {
      font-family: inherit;
      font-size: 12px;
      color: var(--pf-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }

    .pf-link:hover {
      color: var(--pf-accent);
      text-decoration: underline;
    }

    /* Onboarding - also centered */
    .pf-onboarding {
      padding: 24px;
    }

    .pf-onboarding-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--pf-text);
      margin-bottom: 6px;
    }

    .pf-onboarding-sub {
      font-size: 13px;
      color: var(--pf-text-secondary);
      margin-bottom: 16px;
    }

    .pf-features {
      margin-bottom: 20px;
    }

    .pf-feature {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 6px 0;
      font-size: 13px;
      color: var(--pf-text-secondary);
    }

    .pf-feature-bullet {
      width: 5px;
      height: 5px;
      background: var(--pf-text-muted);
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }

    .pf-onboarding .pf-actions {
      justify-content: flex-start;
      gap: 12px;
    }
  `;

  // SVG Icons (no emojis)
  const ICONS = {
    warn: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
    block: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>',
    shield: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a.75.75 0 01.596.3l6 8a.75.75 0 01-.596 1.2H4a.75.75 0 01-.596-1.2l6-8A.75.75 0 0110 1zM4.5 13a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zm2 3a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75z" clip-rule="evenodd"/></svg>'
  };

  // ============================================================================
  // SHADOW DOM SETUP
  // ============================================================================
  function ensureShadowRoot() {
    if (shadowRoot) return shadowRoot;

    shadowHost = document.createElement('div');
    shadowHost.id = 'promptfence-host';
    shadowHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = MODAL_STYLES;
    shadowRoot.appendChild(style);

    return shadowRoot;
  }

  function clearModal() {
    if (shadowRoot) {
      const backdrop = shadowRoot.querySelector('.pf-backdrop');
      const modal = shadowRoot.querySelector('.pf-modal');
      if (backdrop) backdrop.remove();
      if (modal) modal.remove();
    }
    pendingText = null;
    pendingMatches = null;
    pendingTarget = null;
  }

  function restoreFocus() {
    if (lastFocusedElement && lastFocusedElement.focus) {
      try { lastFocusedElement.focus(); } catch (e) {}
    }
    lastFocusedElement = null;
  }

  // ============================================================================
  // CONFIG
  // ============================================================================
  function loadConfig() {
    if (disabledDueToRuntime) return;

    // Load from local storage first
    safeStorageGet(['localConfig'], 'local').then(function(result) {
      if (result.localConfig) {
        localConfig = result.localConfig;
        debugMode = localConfig.debugMode === true;
      }
    });

    // Then load from sync storage
    safeStorageGet(['preset', 'rules', 'enableWarn', 'enableBlock', 'debugMode', 'hasSeenOnboarding'], 'sync').then(function(result) {
      hasSeenOnboarding = result.hasSeenOnboarding === true;

      if (result.preset || result.rules) {
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
      } else {
        localConfig = {
          preset: 'personal',
          rules: PromptFencePresets.personal.rules,
          enableWarn: true,
          enableBlock: true,
          debugMode: false
        };
      }

      if (!hasSeenOnboarding && !disabledDueToRuntime) {
        onboardingTimeoutId = setTimeout(showOnboarding, 500);
      }
    });
  }

  loadConfig();

  // Listen for storage changes (safely)
  removeStorageListener = safeAddStorageListener(function(changes, areaName) {
    if (disabledDueToRuntime) return;
    if (areaName === 'sync' && changes.hasSeenOnboarding) {
      hasSeenOnboarding = changes.hasSeenOnboarding.newValue;
    }
  });

  // ============================================================================
  // HELPERS
  // ============================================================================
  function getRules() {
    return localConfig?.rules || PromptFencePresets.personal.rules;
  }

  function determineAction(detectedTypes) {
    const rules = getRules();
    const blockTypes = [];
    const warnTypes = [];

    for (const type of detectedTypes) {
      const action = rules[type];
      if (action === 'BLOCK') blockTypes.push(type);
      else if (action === 'WARN') warnTypes.push(type);
    }

    const enableBlock = localConfig?.enableBlock !== false;
    const enableWarn = localConfig?.enableWarn !== false;

    if (blockTypes.length > 0 && enableBlock) return { action: 'BLOCK', types: blockTypes };
    if (warnTypes.length > 0 && enableWarn) return { action: 'WARN', types: warnTypes };
    return { action: 'ALLOW', types: [] };
  }

  function getCurrentPreset() {
    const presetId = localConfig?.preset || 'personal';
    return PromptFencePresets[presetId] || PromptFencePresets.personal;
  }

  function getTypeLabel(typeId) {
    return PromptFenceDataTypes[typeId]?.label || typeId;
  }

  function getPlaceholder(typeId) {
    return PromptFenceDataTypes[typeId]?.placeholder || '[REDACTED]';
  }

  // ============================================================================
  // ANONYMIZATION
  // ============================================================================
  function anonymizeText(text, matches) {
    if (!matches || matches.length === 0) return text;

    // Sort matches by start position descending to replace from end
    const sorted = [...matches].sort((a, b) => b.start - a.start);

    let result = text;
    for (const m of sorted) {
      const placeholder = getPlaceholder(m.type);
      result = result.slice(0, m.start) + placeholder + result.slice(m.end);
    }
    return result;
  }

  function insertTextIntoTarget(target, text) {
    if (!target) return;

    try {
      if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
        // For textarea/input, set value and dispatch input event
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const before = target.value.substring(0, start);
        const after = target.value.substring(end);
        target.value = before + text + after;
        target.selectionStart = target.selectionEnd = start + text.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable) {
        // For contenteditable, use execCommand or insertText
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          target.textContent += text;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      if (debugMode) {
        console.error('[PromptFence] Insert failed:', e);
      }
    }
  }

  // ============================================================================
  // ONBOARDING
  // ============================================================================
  function showOnboarding() {
    if (hasSeenOnboarding || disabledDueToRuntime) return;

    const root = ensureShadowRoot();
    clearModal();

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'pf-backdrop';
    root.appendChild(backdrop);

    // Modal
    const modal = document.createElement('div');
    modal.className = 'pf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="pf-onboarding">
        <div class="pf-onboarding-title">PromptFence</div>
        <div class="pf-onboarding-sub">Catch sensitive data before sharing it with AI.</div>
        <div class="pf-features">
          <div class="pf-feature">
            <div class="pf-feature-bullet"></div>
            <span>Detects emails, phone numbers, card numbers, and more</span>
          </div>
          <div class="pf-feature">
            <div class="pf-feature-bullet"></div>
            <span>Pauses to let you review before sending</span>
          </div>
          <div class="pf-feature">
            <div class="pf-feature-bullet"></div>
            <span>Runs 100% locally in your browser</span>
          </div>
        </div>
        <div class="pf-actions">
          <button class="pf-btn pf-btn--primary" data-action="dismiss">Got it</button>
          <button class="pf-link" data-action="settings">Settings</button>
        </div>
      </div>
    `;

    root.appendChild(modal);

    const dismissBtn = modal.querySelector('[data-action="dismiss"]');
    const settingsBtn = modal.querySelector('[data-action="settings"]');

    function dismiss() {
      safeStorageSet({ hasSeenOnboarding: true }, 'sync');
      hasSeenOnboarding = true;
      closeModalSafely();
    }

    dismissBtn.addEventListener('click', dismiss);
    backdrop.addEventListener('click', dismiss);
    settingsBtn.addEventListener('click', function() {
      safeOpenOptionsPage();
      dismiss();
    });

    dismissBtn.focus();
  }

  // ============================================================================
  // DETECTION MODAL
  // ============================================================================
  function showModal(matches, action, originalText, targetElement) {
    if (disabledDueToRuntime) return;

    const root = ensureShadowRoot();
    clearModal();
    lastFocusedElement = document.activeElement;

    pendingText = originalText;
    pendingMatches = matches;
    pendingTarget = targetElement;

    const isBlock = action === 'BLOCK';
    const preset = getCurrentPreset();
    const isFinance = preset.id === 'finance';
    const modalCopy = isBlock ? preset.modal.block : preset.modal.warn;

    // Get unique types
    const uniqueTypes = [...new Set(matches.map(m => m.type))];

    let modalClass = 'pf-modal';
    if (isFinance && isBlock) {
      modalClass += ' pf-modal--finance';
    } else if (isBlock) {
      modalClass += ' pf-modal--block';
    } else {
      modalClass += ' pf-modal--warn';
    }

    const iconKey = isBlock ? 'block' : 'warn';

    // Build chips HTML
    const chipsHtml = uniqueTypes.slice(0, 4).map(t =>
      `<span class="pf-chip">${getTypeLabel(t)}</span>`
    ).join('');
    const moreCount = uniqueTypes.length - 4;
    const moreHtml = moreCount > 0 ? `<span class="pf-chip">+${moreCount} more</span>` : '';

    // Build action buttons - single row, right-aligned
    let actionsHtml;
    if (isBlock) {
      actionsHtml = `
        <button class="pf-btn pf-btn--secondary" data-action="cancel">Cancel</button>
        <button class="pf-btn pf-btn--primary" data-action="anonymize">Anonymize</button>
      `;
    } else {
      actionsHtml = `
        <button class="pf-btn pf-btn--secondary" data-action="allow">Allow once</button>
        <button class="pf-btn pf-btn--primary" data-action="anonymize">Anonymize</button>
      `;
    }

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'pf-backdrop';
    root.appendChild(backdrop);

    // Modal
    const modal = document.createElement('div');
    modal.className = modalClass;
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="pf-header">
        <div class="pf-title-row">
          <span class="pf-icon">${ICONS[iconKey]}</span>
          <span class="pf-title">${modalCopy.title}</span>
        </div>
        ${!isBlock ? `<button class="pf-close" data-action="close" aria-label="Close">${ICONS.close}</button>` : ''}
      </div>
      <div class="pf-body">
        <div class="pf-subtitle">${modalCopy.body}</div>
        <div class="pf-chips">${chipsHtml}${moreHtml}</div>
        <div class="pf-guidance">${preset.guidance}</div>
        <div class="pf-actions">
          ${actionsHtml}
        </div>
      </div>
      <div class="pf-footer">
        <button class="pf-link" data-action="settings">Settings</button>
      </div>
    `;

    root.appendChild(modal);

    // Event handlers
    const anonymizeBtn = modal.querySelector('[data-action="anonymize"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const allowBtn = modal.querySelector('[data-action="allow"]');
    const closeBtn = modal.querySelector('[data-action="close"]');
    const settingsBtn = modal.querySelector('[data-action="settings"]');

    anonymizeBtn.addEventListener('click', function() {
      try {
        const anonymized = anonymizeText(pendingText, pendingMatches);
        insertTextIntoTarget(pendingTarget, anonymized);
        if (debugMode) {
          console.log('[PromptFence] Anonymized and inserted');
        }
      } catch (e) {
        if (debugMode) {
          console.error('[PromptFence] Anonymize error:', e);
        }
      }
      closeModalSafely();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        closeModalSafely();
      });
    }

    if (allowBtn) {
      allowBtn.addEventListener('click', function() {
        try {
          // For WARN: insert original text
          insertTextIntoTarget(pendingTarget, pendingText);
          if (debugMode) {
            console.log('[PromptFence] Allowed once');
          }
        } catch (e) {
          if (debugMode) {
            console.error('[PromptFence] Allow error:', e);
          }
        }
        closeModalSafely();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        closeModalSafely();
      });
    }

    // Backdrop click for WARN only (not BLOCK - must be intentional)
    if (!isBlock) {
      backdrop.addEventListener('click', function() {
        closeModalSafely();
      });
    }

    settingsBtn.addEventListener('click', function() {
      safeOpenOptionsPage();
      // Don't close modal - let user continue after viewing settings
    });

    // Keyboard handling
    function handleKeydown(e) {
      if (e.key === 'Escape' && !isBlock) {
        closeModalSafely();
      }
    }
    modal.addEventListener('keydown', handleKeydown);

    anonymizeBtn.focus();
  }

  // ============================================================================
  // PASTE HANDLING
  // ============================================================================
  if (!isAiDomain(window.location.hostname, PromptFenceConfig.aiDomains)) {
    return;
  }

  function isPromptField(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const type = (target.type || '').toLowerCase();
      return type === 'text' || type === 'search' || type === '';
    }
    const ce = target.getAttribute('contenteditable');
    return target.isContentEditable || ce === 'true' || ce === '' || ce === 'plaintext-only';
  }

  function findEditableAncestor(el) {
    let current = el;
    while (current && current !== document.documentElement) {
      if (isPromptField(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function getPastedText(event) {
    if (event.clipboardData?.getData) {
      return event.clipboardData.getData('text/plain') || '';
    }
    return '';
  }

  function handlePaste(event) {
    // If extension is disabled due to runtime issues, allow normal paste (fail-open)
    if (disabledDueToRuntime) {
      return;
    }

    try {
      let target = document.activeElement || event.target;
      target = findEditableAncestor(target);
      if (!target) return;

      const text = getPastedText(event);
      if (!text) return;

      // Use detectMatchesWithRanges for full match info
      const matches = detectMatchesWithRanges(text);
      if (matches.length === 0) return;

      const types = [...new Set(matches.map(m => m.type))];
      const { action } = determineAction(types);
      if (action === 'ALLOW') return;

      // Always prevent default paste - we handle insertion
      event.preventDefault();
      event.stopPropagation();

      showModal(matches, action, text, target);
      if (debugMode) {
        console.log('[PromptFence]', action + ':', types.join(', '));
      }
    } catch (e) {
      // On any error, fail-open: allow normal paste
      if (debugMode) {
        console.error('[PromptFence] Paste handler error:', e);
      }
      // Do not re-throw - let paste proceed normally
    }
  }

  document.addEventListener('paste', handlePaste, true);
  pasteHandlerAttached = true;
  console.log('[PromptFence] Active on', window.location.hostname);
})();
