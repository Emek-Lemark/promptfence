/**
 * PromptFence popup — dual mode: personal / team
 * Handles install code entry, team config fetch, and disconnect.
 */

const API_BASE = 'https://app.promptfence.ai';

document.addEventListener('DOMContentLoaded', function () {

  // ── Element refs ────────────────────────────────────────────────
  const loading       = document.getElementById('loading');
  const viewPersonal  = document.getElementById('view-personal');
  const viewTeam      = document.getElementById('view-team');
  const codeInput     = document.getElementById('code-input');
  const connectBtn    = document.getElementById('connect-btn');
  const connectError  = document.getElementById('connect-error');
  const settingsBtn   = document.getElementById('settings-btn');
  const teamOrgName   = document.getElementById('team-org-name');
  const disconnectBtn = document.getElementById('disconnect-btn');

  // ── Boot: decide which view to show ────────────────────────────
  chrome.storage.local.get(['installCode', 'teamConfig'], function (result) {
    loading.classList.add('hidden');

    if (result.installCode) {
      showTeamView(result.teamConfig);
    } else {
      viewPersonal.classList.remove('hidden');
      codeInput.focus();
    }
  });

  // ── Personal view: connect ──────────────────────────────────────
  function showError(msg) {
    connectError.textContent = msg;
    connectError.classList.remove('hidden');
    codeInput.classList.add('error');
  }

  function clearError() {
    connectError.classList.add('hidden');
    codeInput.classList.remove('error');
  }

  async function handleConnect() {
    const code = codeInput.value.trim().toUpperCase();
    if (!code) { showError('Enter your team code.'); return; }
    if (code.length < 6) { showError('Code looks too short. Check with your admin.'); return; }

    clearError();
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting…';

    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        headers: { 'X-Install-Code': code }
      });

      if (!res.ok) {
        showError('Code not found. Check with your admin.');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
        return;
      }

      const config = await res.json();

      // Save install code and team config
      chrome.storage.local.set({
        installCode: code,
        teamConfig: config,
        teamConfigFetchedAt: Date.now()
      }, function () {
        showTeamView(config);
      });

    } catch (e) {
      showError('Connection failed. Check your internet and try again.');
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect';
    }
  }

  connectBtn.addEventListener('click', handleConnect);

  codeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleConnect();
    clearError();
  });

  // Force uppercase as user types
  codeInput.addEventListener('input', function () {
    const pos = codeInput.selectionStart;
    codeInput.value = codeInput.value.toUpperCase();
    codeInput.setSelectionRange(pos, pos);
  });

  // ── Settings button ─────────────────────────────────────────────
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
      try {
        chrome.runtime.openOptionsPage();
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      }
    });
  }

  // ── Team view ────────────────────────────────────────────────────
  function showTeamView(config) {
    viewPersonal.classList.add('hidden');
    viewTeam.classList.remove('hidden');

    if (config && config.orgName) {
      teamOrgName.textContent = config.orgName;
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', function () {
      if (!confirm('Disconnect from your team? You will switch back to personal mode.')) return;

      chrome.storage.local.remove(['installCode', 'teamConfig', 'teamConfigFetchedAt'], function () {
        viewTeam.classList.add('hidden');
        viewPersonal.classList.remove('hidden');
        codeInput.value = '';
        codeInput.focus();
      });
    });
  }

});
