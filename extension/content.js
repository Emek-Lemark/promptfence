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
  let teamConfig = null; // Set when in team mode (installCode present)
  let debugMode = false;
  let hasSeenOnboarding = false;
  let shadowHost = null;
  let shadowRoot = null;
  let lastFocusedElement = null;
  let pendingText = null;
  let pendingMatches = null;
  let pendingTarget = null;
  let pendingSource = 'paste'; // 'paste' or 'submit'
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

    .pf-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .pf-close, .pf-gear {
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

    .pf-close:hover, .pf-gear:hover {
      background: var(--pf-surface);
      color: var(--pf-text);
    }

    .pf-close svg {
      width: 18px;
      height: 18px;
    }

    .pf-gear svg {
      width: 15px;
      height: 15px;
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

    .pf-org-label {
      font-size: 12px;
      color: var(--pf-text-muted);
      font-style: italic;
    }

    /* Micro-lesson success state */
    .pf-lesson-check {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #dcfce7;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      font-size: 20px;
    }

    @media (prefers-color-scheme: dark) {
      .pf-lesson-check {
        background: #14532d;
      }
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

    /* Team CTA */
    .pf-team-cta {
      border-top: 1px solid var(--pf-border);
      padding: 12px 20px;
      background: var(--pf-surface);
      border-radius: 0 0 var(--pf-radius) var(--pf-radius);
    }

    .pf-team-cta-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pf-team-cta-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--pf-accent);
    }

    .pf-team-cta-icon svg {
      width: 100%;
      height: 100%;
    }

    .pf-team-cta-text {
      flex: 1;
      font-size: 12px;
      color: var(--pf-text-muted);
      line-height: 1.4;
    }

    .pf-team-cta-text strong {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--pf-text-secondary);
    }

    .pf-team-cta-link {
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      color: var(--pf-accent);
      text-decoration: none;
      white-space: nowrap;
      padding: 4px 8px;
      border-radius: var(--pf-radius-sm);
    }

    .pf-team-cta-link:hover {
      text-decoration: underline;
      background: rgba(37, 99, 235, 0.08);
    }
  `;

  // SVG Icons (no emojis)
  const ICONS = {
    warn: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
    block: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>',
    gear: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.18 1.052a6.012 6.012 0 011.442.83l1.01-.388a1 1 0 011.197.447l.68 1.178a1 1 0 01-.247 1.284l-.838.665a6.073 6.073 0 010 1.656l.838.665a1 1 0 01.247 1.284l-.68 1.178a1 1 0 01-1.197.447l-1.01-.388a6.012 6.012 0 01-1.442.83l-.18 1.052A1 1 0 0110.68 15H9.32a1 1 0 01-.98-.804l-.18-1.052a6.012 6.012 0 01-1.442-.83l-1.01.388a1 1 0 01-1.197-.447l-.68-1.178a1 1 0 01.247-1.284l.838-.665a6.073 6.073 0 010-1.656l-.838-.665a1 1 0 01-.247-1.284l.68-1.178a1 1 0 011.197-.447l1.01.388a6.012 6.012 0 011.442-.83l.18-1.052zM10 12a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>',
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

  /**
   * Check if we're in team mode (install code present).
   */
  function isTeamMode() {
    return !!teamConfig;
  }

  function loadConfig() {
    if (disabledDueToRuntime) return;

    // Check for team mode first
    safeStorageGet(['installCode', 'teamConfig'], 'local').then(function(result) {
      if (result.installCode) {
        // Team mode — use cached team config, then refresh in background
        if (result.teamConfig) {
          applyTeamConfig(result.teamConfig);
        }
        // Ask service worker to fetch/refresh team config
        safeSendMessage({ type: 'FETCH_TEAM_CONFIG' });
        // Report platform visit for shadow AI discovery
        safeSendMessage({ type: 'REPORT_PLATFORM_VISIT', aiDomain: window.location.hostname });
        return;
      }

      // Personal mode — load from sync storage
      loadPersonalConfig();
    });
  }

  function applyTeamConfig(config) {
    teamConfig = config;
    localConfig = {
      preset: config.preset || 'workplace',
      rules: config.rules || PromptFencePresets.workplace.rules,
      enableWarn: true,
      enableBlock: true,
      debugMode: false,
      customTerms: config.customTerms || [],
      orgName: config.orgName || null,
      fileUploadWarning: config.fileUploadWarning || false,
    };
    debugMode = false;

    // Show policy gate if needed (after a brief delay to let DOM settle)
    if (needsPolicyAcknowledgment()) {
      setTimeout(showPolicyGate, 500);
    }
  }

  function loadPersonalConfig() {
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
    // Reload team config when it changes
    if (areaName === 'local' && changes.teamConfig && changes.teamConfig.newValue) {
      applyTeamConfig(changes.teamConfig.newValue);
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
      if (type === 'CUSTOM_TERM') { warnTypes.push(type); continue; }
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
    if (typeId === 'CUSTOM_TERM') return 'Custom term';
    return PromptFenceDataTypes[typeId]?.label || typeId;
  }

  function getPlaceholder(typeId) {
    if (typeId === 'CUSTOM_TERM') return '[REDACTED]';
    return PromptFenceDataTypes[typeId]?.placeholder || '[REDACTED]';
  }

  // ============================================================================
  // CUSTOM TERMS DETECTION (Team mode)
  // ============================================================================

  /**
   * Detect custom terms in text (case-insensitive).
   * Returns matches in the same format as detectMatchesWithRanges.
   */
  function detectCustomTerms(text) {
    const terms = localConfig?.customTerms;
    if (!terms || !Array.isArray(terms) || terms.length === 0) return [];

    const matches = [];
    const lowerText = text.toLowerCase();

    for (const term of terms) {
      if (!term) continue;
      const lowerTerm = term.toLowerCase();
      let idx = 0;
      while ((idx = lowerText.indexOf(lowerTerm, idx)) !== -1) {
        matches.push({
          type: 'CUSTOM_TERM',
          value: text.slice(idx, idx + term.length),
          start: idx,
          end: idx + term.length,
          term: term
        });
        idx += term.length;
      }
    }

    return matches;
  }

  /**
   * Detect all matches: built-in patterns + custom terms.
   */
  function detectAllMatches(text) {
    const builtIn = detectMatchesWithRanges(text);
    const custom = detectCustomTerms(text);
    return builtIn.concat(custom);
  }

  // ============================================================================
  // PROGRESSIVE MICRO-LESSONS — shown after anonymizing, friendly + educational
  // Uses PFLessons from lessons.js (loaded before content.js in manifest)
  // ============================================================================

  /**
   * Replace the modal body with a progressive lesson based on how many times
   * this user has seen this data type before. Auto-dismisses after 4 seconds.
   * Also updates the literacy score in storage.
   */
  function showMicroLesson(modal, types) {
    if (!modal) return;

    // Swap out modal chrome immediately so user sees feedback at once
    const body    = modal.querySelector('.pf-body');
    const header  = modal.querySelector('.pf-header');
    const footer  = modal.querySelector('.pf-footer');
    const teamCta = modal.querySelector('.pf-team-cta');

    if (header)  header.style.display  = 'none';
    if (footer)  footer.style.display  = 'none';
    if (teamCta) teamCta.style.display = 'none';

    // Show a brief spinner-free placeholder immediately
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;padding:8px 0 4px;">
          <div class="pf-lesson-check">✓</div>
          <div style="font-size:15px;font-weight:600;color:var(--pf-text);margin-bottom:8px;">Anonymized.</div>
          <div style="font-size:13px;color:var(--pf-text-muted);">Loading your lesson…</div>
        </div>
      `;
    }

    modal.className = 'pf-modal';
    modal.style.border = '1px solid #bbf7d0';

    // Use progressive lesson system if available; fall back to static
    if (typeof PFLessons !== 'undefined') {
      PFLessons.recordDetection(types, true, function(lesson, literacyData) {
        if (!body || !shadowRoot) return; // modal may have been dismissed

        const scoreLabel = PFLessons.getScoreLabel(literacyData.score);
        const contextHtml = lesson.context
          ? `<div style="margin-top:10px;padding:8px 12px;background:var(--pf-surface);border-radius:6px;font-size:12px;color:var(--pf-text-muted);line-height:1.5;border-left:3px solid #bbf7d0;">${lesson.context}</div>`
          : '';

        body.innerHTML = `
          <div style="text-align:center;padding:8px 0 4px;">
            <div class="pf-lesson-check">✓</div>
            <div style="font-size:15px;font-weight:600;color:var(--pf-text);margin-bottom:8px;">${lesson.headline}</div>
            <div style="font-size:13px;color:var(--pf-text-secondary);line-height:1.6;max-width:320px;margin:0 auto;">${lesson.tip}</div>
            ${contextHtml}
            <div style="margin-top:14px;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--pf-surface);border-radius:99px;font-size:11px;color:var(--pf-text-muted);">
              <span style="color:#7c3aed;font-weight:600;">AI Literacy</span>
              <span style="font-weight:700;color:var(--pf-text);">${literacyData.score}/100</span>
              <span style="color:var(--pf-text-muted);">· ${scoreLabel}</span>
            </div>
          </div>
        `;
      });
    } else {
      // Fallback: static lesson (PFLessons not loaded)
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:8px 0 4px;">
            <div class="pf-lesson-check">✓</div>
            <div style="font-size:15px;font-weight:600;color:var(--pf-text);margin-bottom:8px;">Good instinct.</div>
            <div style="font-size:13px;color:var(--pf-text-secondary);line-height:1.6;max-width:320px;margin:0 auto;">Reviewing data before it reaches an AI tool is exactly the right habit. Keep it up.</div>
          </div>
        `;
      }
    }

    // Auto-dismiss after 4 seconds
    setTimeout(function() {
      closeModalSafely();
    }, 4000);
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

  function replaceTextInTarget(target, text) {
    if (!target) return;

    try {
      if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
        target.value = text;
        target.selectionStart = target.selectionEnd = text.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable) {
        target.textContent = text;
        // Move cursor to end
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      if (debugMode) {
        console.error('[PromptFence] Replace failed:', e);
      }
    }
  }

  // ============================================================================
  // POLICY ACKNOWLEDGMENT (Team mode)
  // ============================================================================

  /**
   * Check if policy needs to be acknowledged before extension activates.
   */
  function needsPolicyAcknowledgment() {
    if (!isTeamMode()) return false;
    if (!teamConfig.policyText) return false;
    return !teamConfig.policyAcknowledged;
  }

  function showPolicyGate() {
    if (disabledDueToRuntime) return;

    const root = ensureShadowRoot();
    clearModal();

    const backdrop = document.createElement('div');
    backdrop.className = 'pf-backdrop';
    root.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.className = 'pf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const orgName = localConfig?.orgName || 'Your organization';
    const policyText = teamConfig.policyText || '';

    modal.innerHTML = `
      <div class="pf-onboarding">
        <div class="pf-onboarding-title">AI Usage Policy</div>
        <div class="pf-onboarding-sub">${orgName} requires you to review their AI usage policy before continuing.</div>
        <div style="max-height:200px;overflow-y:auto;background:var(--pf-surface);border:1px solid var(--pf-border);border-radius:8px;padding:12px;margin:12px 0;font-size:13px;line-height:1.6;color:var(--pf-text-secondary);white-space:pre-wrap;">${policyText}</div>
        <div class="pf-actions">
          <button class="pf-btn pf-btn--primary" data-action="acknowledge">I acknowledge this policy</button>
        </div>
      </div>
    `;

    root.appendChild(modal);

    const ackBtn = modal.querySelector('[data-action="acknowledge"]');
    ackBtn.addEventListener('click', function() {
      safeSendMessage({ type: 'ACKNOWLEDGE_POLICY' });
      if (teamConfig) teamConfig.policyAcknowledged = true;
      closeModalSafely();
    });

    ackBtn.focus();
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
  function showModal(matches, action, originalText, targetElement, source) {
    if (disabledDueToRuntime) return;

    const root = ensureShadowRoot();
    clearModal();
    lastFocusedElement = document.activeElement;

    pendingText = originalText;
    pendingMatches = matches;
    pendingTarget = targetElement;
    pendingSource = source || 'paste';

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
        <div class="pf-header-actions">
          ${!isTeamMode() ? `<button class="pf-gear" data-action="settings" aria-label="Settings">${ICONS.gear}</button>` : ''}
          ${!isBlock ? `<button class="pf-close" data-action="close" aria-label="Close">${ICONS.close}</button>` : ''}
        </div>
      </div>
      <div class="pf-body">
        <div class="pf-subtitle">${modalCopy.body}</div>
        <div class="pf-chips">${chipsHtml}${moreHtml}</div>
        <div class="pf-guidance">${preset.guidance}</div>
        <div class="pf-actions">
          ${actionsHtml}
        </div>
      </div>
      ${isTeamMode() && localConfig.orgName ? `<div class="pf-footer"><span class="pf-org-label">Policy set by ${localConfig.orgName}</span></div>` : ''}
    `;

    root.appendChild(modal);

    // Event handlers
    const anonymizeBtn = modal.querySelector('[data-action="anonymize"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const allowBtn = modal.querySelector('[data-action="allow"]');
    const closeBtn = modal.querySelector('[data-action="close"]');
    const settingsBtn = modal.querySelector('[data-action="settings"]');

    anonymizeBtn.addEventListener('click', function() {
      const detectedTypes = pendingMatches ? [...new Set(pendingMatches.map(m => m.type))] : [];
      try {
        const anonymized = anonymizeText(pendingText, pendingMatches);
        if (pendingSource === 'submit') {
          replaceTextInTarget(pendingTarget, anonymized);
        } else {
          insertTextIntoTarget(pendingTarget, anonymized);
        }
        if (debugMode) {
          console.log('[PromptFence] Anonymized and', pendingSource === 'submit' ? 'replaced' : 'inserted');
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
          if (pendingSource === 'submit') {
            // Text is already in the field — just send it
            closeModalSafely();
            triggerNativeSend();
          } else {
            // Paste source — text was intercepted, insert it now
            insertTextIntoTarget(pendingTarget, pendingText);
            closeModalSafely();
          }
          if (debugMode) {
            console.log('[PromptFence] Allowed once (source:', pendingSource, ')');
          }
        } catch (e) {
          if (debugMode) {
            console.error('[PromptFence] Allow error:', e);
          }
          closeModalSafely();
        }
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

    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        safeOpenOptionsPage();
      });
    }

    // Team CTA (only in personal mode)
    if (!isTeamMode()) {
      safeStorageGet(['installCode'], 'local').then(function(result) {
        if (!result.installCode && shadowRoot) {
          const cta = document.createElement('div');
          cta.className = 'pf-team-cta';
          cta.innerHTML = `
            <div class="pf-team-cta-content">
              <span class="pf-team-cta-icon">${ICONS.shield}</span>
              <div class="pf-team-cta-text">
                <strong>Protect your whole team</strong>
                <span>Company-wide rules and audit trail.</span>
              </div>
              <a class="pf-team-cta-link" href="https://promptfence.ai/teams" target="_blank" rel="noopener">Start free trial &rarr;</a>
            </div>
          `;
          modal.appendChild(cta);
        }
      });
    }

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

    // If policy needs acknowledgment, show gate and block
    if (needsPolicyAcknowledgment()) {
      event.preventDefault();
      event.stopPropagation();
      showPolicyGate();
      return;
    }

    try {
      let target = document.activeElement || event.target;
      target = findEditableAncestor(target);
      if (!target) return;

      const text = getPastedText(event);
      if (!text) return;

      // Detect built-in patterns + custom terms
      const matches = detectAllMatches(text);
      if (matches.length === 0) return;

      const types = [...new Set(matches.map(m => m.type))];
      const { action } = determineAction(types);
      if (action === 'ALLOW') return;

      // Always prevent default paste - we handle insertion
      event.preventDefault();
      event.stopPropagation();

      // Report event to backend in team mode
      if (isTeamMode()) {
        safeSendMessage({
          type: 'POST_EVENT',
          eventData: { action, dataTypes: types, aiDomain: window.location.hostname, source: 'paste' }
        });
      }

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

  // ============================================================================
  // SUBMIT GUARD — scan full prompt text at send time
  // ============================================================================

  /** Site-specific selectors for send button and prompt input. */
  const SITE_SELECTORS = {
    'chatgpt.com': {
      sendBtn: '[data-testid="send-button"]',
      input: '#prompt-textarea, [contenteditable="true"]'
    },
    'chat.openai.com': {
      sendBtn: '[data-testid="send-button"]',
      input: '#prompt-textarea, [contenteditable="true"]'
    },
    'claude.ai': {
      sendBtn: 'button[aria-label="Send Message"]',
      input: '[contenteditable="true"], .ProseMirror'
    },
    'gemini.google.com': {
      sendBtn: '.send-button, button[aria-label="Send message"]',
      input: '.ql-editor, [contenteditable="true"], textarea'
    }
  };

  const siteHostname = window.location.hostname;
  const siteConf = SITE_SELECTORS[siteHostname] || null;

  /** Flag to temporarily disable the guard (for "Send anyway"). */
  let submitGuardActive = true;

  function getPromptText() {
    const selectors = siteConf ? siteConf.input : 'textarea, [contenteditable="true"]';
    const el = document.querySelector(selectors);
    if (!el) return '';
    if (el.tagName && el.tagName.toLowerCase() === 'textarea') {
      return el.value || '';
    }
    return el.innerText || '';
  }

  function getPromptElement() {
    const selectors = siteConf ? siteConf.input : 'textarea, [contenteditable="true"]';
    return document.querySelector(selectors);
  }

  function triggerNativeSend() {
    const btnSel = siteConf ? siteConf.sendBtn : null;
    if (btnSel) {
      const btn = document.querySelector(btnSel);
      if (btn) {
        submitGuardActive = false;
        btn.click();
        setTimeout(function() { submitGuardActive = true; }, 0);
        return;
      }
    }
    // Fallback: dispatch Enter on the input
    const input = getPromptElement();
    if (input) {
      submitGuardActive = false;
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true
      }));
      setTimeout(function() { submitGuardActive = true; }, 0);
    }
  }

  function interceptSubmit(event) {
    if (!submitGuardActive || disabledDueToRuntime) return false;

    if (needsPolicyAcknowledgment()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showPolicyGate();
      return true;
    }

    const text = getPromptText();
    if (!text) return false;

    const matches = detectAllMatches(text);
    if (matches.length === 0) return false;

    const types = [...new Set(matches.map(m => m.type))];
    const result = determineAction(types);
    if (result.action === 'ALLOW') return false;

    event.preventDefault();
    event.stopImmediatePropagation();

    // Report event to backend in team mode
    if (isTeamMode()) {
      safeSendMessage({
        type: 'POST_EVENT',
        eventData: { action: result.action, dataTypes: types, aiDomain: window.location.hostname, source: 'submit' }
      });
    }

    // For submit, show modal with the prompt element as target
    const target = getPromptElement();
    showModal(matches, result.action, text, target, 'submit');

    if (debugMode) {
      console.log('[PromptFence]', result.action, '(submit):', result.types.join(', '));
    }

    return true;
  }

  function handleSendClick(event) {
    const btnSel = siteConf ? siteConf.sendBtn : null;
    if (btnSel && !event.target.closest(btnSel)) return;
    interceptSubmit(event);
  }

  function handleEnterKey(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const active = document.activeElement;
    if (!active || !findEditableAncestor(active)) return;
    interceptSubmit(event);
  }

  // Attach send-button listeners via MutationObserver
  const observedSendBtns = new WeakSet();

  function attachSendBtnListeners() {
    let btnSel = siteConf ? siteConf.sendBtn : null;
    if (!btnSel) {
      btnSel = 'button[aria-label*="send" i], button[aria-label*="Send"], button[data-testid*="send"]';
    }
    const btns = document.querySelectorAll(btnSel);
    btns.forEach(function(btn) {
      if (!observedSendBtns.has(btn)) {
        observedSendBtns.add(btn);
        btn.addEventListener('click', handleSendClick, true);
      }
    });
  }

  attachSendBtnListeners();

  const sendBtnObserver = new MutationObserver(function() {
    attachSendBtnListeners();
  });
  sendBtnObserver.observe(document.body, { childList: true, subtree: true });

  // Enter key listener (capture phase)
  document.addEventListener('keydown', handleEnterKey, true);

  console.log('[PromptFence] Active on', window.location.hostname);
})();
