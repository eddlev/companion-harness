// ── State ──────────────────────────────────────────────
let profiles = [];
let activeProfileId = null;
let editingProfileId = null;
let selectedEmoji = '🜲';
let settings = {};
let connection = {};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  bindTabs();
  bindProfileActions();
  bindConnectionActions();
  bindSettingsActions();
  bindModalActions();
  checkServerStatus();
});

async function loadAll() {
  const data = await chrome.storage.local.get([
    'profiles', 'activeProfileId', 'settings', 'connection', 'lastMemory'
  ]);

  profiles = data.profiles || getDefaultProfiles();
  activeProfileId = data.activeProfileId || (profiles[0]?.id ?? null);
  settings = data.settings || getDefaultSettings();
  connection = data.connection || getDefaultConnection();

  renderProfiles();
  populateConnectionForm();
  populateSettingsForm();
  renderMemory(data.lastMemory || null);
}

function getDefaultProfiles() {
  return [];
}

function getDefaultSettings() {
  return {
    autoInject: false,
    showBtn: true,
    failGraceful: true,
    showStatus: true,
    injectDelay: 400,
    remindInterval: 8
  };
}

function getDefaultConnection() {
  return {
    port: 31221,
    token: '',
    claudeSelector: '.ProseMirror',
    chatgptSelector: '#prompt-textarea'
  };
}

// ── Tabs ───────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// ── Profiles ───────────────────────────────────────────
function renderProfiles() {
  const list = document.getElementById('profileList');

  if (profiles.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph">🜲</div>
        <div class="empty-text">No companions yet.<br>Create your first profile.</div>
      </div>`;
    return;
  }

  list.innerHTML = profiles.map(p => `
    <div class="profile-card ${p.id === activeProfileId ? 'active-profile' : ''}"
         data-id="${p.id}">
      <div class="profile-avatar">${p.emoji}</div>
      <div class="profile-info">
        <div class="profile-name">${escHtml(p.name)}</div>
        <div class="profile-meta">${platformLabel(p.platform)}${p.namespace ? ' · ' + escHtml(p.namespace) : ''}</div>
      </div>
      ${p.id === activeProfileId ? '<span class="active-badge">active</span>' : ''}
      <div class="profile-actions">
        <button class="icon-btn edit-btn" data-id="${p.id}" title="Edit">✎</button>
        <button class="icon-btn danger delete-btn" data-id="${p.id}" title="Delete">✕</button>
      </div>
    </div>
  `).join('');

  // Click card to activate
  list.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.profile-actions')) return;
      setActiveProfile(card.dataset.id);
    });
  });

  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProfile(btn.dataset.id);
    });
  });
}

function platformLabel(p) {
  return { claude: 'Claude.ai', chatgpt: 'ChatGPT', gemini: 'Gemini', auto: 'Auto' }[p] || p;
}

async function setActiveProfile(id) {
  activeProfileId = id;
  await chrome.storage.local.set({ activeProfileId });
  renderProfiles();
  notifyContentScript();
}

async function deleteProfile(id) {
  profiles = profiles.filter(p => p.id !== id);
  if (activeProfileId === id) {
    activeProfileId = profiles[0]?.id ?? null;
  }
  await chrome.storage.local.set({ profiles, activeProfileId });
  renderProfiles();
}

function bindProfileActions() {
  document.getElementById('newProfileBtn').addEventListener('click', () => {
    openNewModal();
  });
}

// ── Modal ──────────────────────────────────────────────
function openNewModal() {
  editingProfileId = null;
  document.getElementById('modalTitle').textContent = 'New Profile';
  document.getElementById('pName').value = '';
  document.getElementById('pPlatform').value = 'claude';
  document.getElementById('pNamespace').value = '';
  document.getElementById('pBoot').value = '';
  selectEmoji('🜲');
  document.getElementById('profileModal').classList.add('open');
}

function openEditModal(id) {
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  editingProfileId = id;
  document.getElementById('modalTitle').textContent = 'Edit Profile';
  document.getElementById('pName').value = p.name;
  document.getElementById('pPlatform').value = p.platform;
  document.getElementById('pNamespace').value = p.namespace || '';
  document.getElementById('pBoot').value = p.boot || '';
  selectEmoji(p.emoji);
  document.getElementById('profileModal').classList.add('open');
}

function selectEmoji(emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.emoji === emoji);
  });
}

function bindModalActions() {
  document.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => selectEmoji(el.dataset.emoji));
  });

  document.getElementById('cancelModal').addEventListener('click', () => {
    document.getElementById('profileModal').classList.remove('open');
  });

  document.getElementById('profileModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('profileModal')) {
      document.getElementById('profileModal').classList.remove('open');
    }
  });

  document.getElementById('saveProfile').addEventListener('click', async () => {
    const name = document.getElementById('pName').value.trim();
    if (!name) {
      document.getElementById('pName').focus();
      return;
    }

    if (editingProfileId) {
      const idx = profiles.findIndex(p => p.id === editingProfileId);
      if (idx > -1) {
        profiles[idx] = {
          ...profiles[idx],
          name,
          emoji: selectedEmoji,
          platform: document.getElementById('pPlatform').value,
          namespace: document.getElementById('pNamespace').value.trim(),
          boot: document.getElementById('pBoot').value.trim()
        };
      }
    } else {
      const newProfile = {
        id: 'p_' + Date.now(),
        name,
        emoji: selectedEmoji,
        platform: document.getElementById('pPlatform').value,
        namespace: document.getElementById('pNamespace').value.trim(),
        boot: document.getElementById('pBoot').value.trim()
      };
      profiles.push(newProfile);
      if (!activeProfileId) activeProfileId = newProfile.id;
    }

    await chrome.storage.local.set({ profiles, activeProfileId });
    document.getElementById('profileModal').classList.remove('open');
    renderProfiles();
    notifyContentScript();
  });
}

// ── Connection ─────────────────────────────────────────
function populateConnectionForm() {
  document.getElementById('serverPort').value = connection.port || 31221;
  document.getElementById('authToken').value = connection.token || '';
  document.getElementById('claudeSelector').value = connection.claudeSelector || '.ProseMirror';
  document.getElementById('chatgptSelector').value = connection.chatgptSelector || '#prompt-textarea';
}

function bindConnectionActions() {
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('saveConnection').addEventListener('click', saveConnection);
}

async function testConnection() {
  const port = document.getElementById('serverPort').value || 31221;
  const token = document.getElementById('authToken').value;
  const result = document.getElementById('testResult');

  result.className = 'test-result';
  result.textContent = 'Testing...';
  result.style.display = 'block';

  try {
    const res = await fetch(`http://localhost:${port}/ping`, {
      method: 'GET',
      headers: { 'x-identity-token': token },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      result.className = 'test-result ok';
      result.textContent = '✓ Server reachable on port ' + port;
      setStatusIndicator(true);
    } else {
      result.className = 'test-result fail';
      result.textContent = '✗ Server responded with ' + res.status;
    }
  } catch (e) {
    result.className = 'test-result fail';
    result.textContent = '✗ Could not reach localhost:' + port;
    setStatusIndicator(false);
  }
}

async function saveConnection() {
  connection = {
    port: parseInt(document.getElementById('serverPort').value) || 31221,
    token: document.getElementById('authToken').value,
    claudeSelector: document.getElementById('claudeSelector').value || '.ProseMirror',
    chatgptSelector: document.getElementById('chatgptSelector').value || '#prompt-textarea'
  };
  await chrome.storage.local.set({ connection });
  notifyContentScript();

  const btn = document.getElementById('saveConnection');
  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = 'Save Connection'; }, 1500);
}

// ── Settings ───────────────────────────────────────────
function populateSettingsForm() {
  document.getElementById('autoInject').checked  = settings.autoInject    ?? false;
  document.getElementById('showBtn').checked      = settings.showBtn       ?? true;
  document.getElementById('failGraceful').checked = settings.failGraceful  ?? true;
  document.getElementById('showStatus').checked   = settings.showStatus    ?? true;
  document.getElementById('injectDelay').value    = settings.injectDelay   ?? 400;
  document.getElementById('remindInterval').value = settings.remindInterval ?? 8;
}

function bindSettingsActions() {
  document.getElementById('saveSettings').addEventListener('click', async () => {
    settings = {
      autoInject:     document.getElementById('autoInject').checked,
      showBtn:        document.getElementById('showBtn').checked,
      failGraceful:   document.getElementById('failGraceful').checked,
      showStatus:     document.getElementById('showStatus').checked,
      injectDelay:    parseInt(document.getElementById('injectDelay').value)    || 400,
      remindInterval: parseInt(document.getElementById('remindInterval').value) || 8
    };
    await chrome.storage.local.set({ settings });
    notifyContentScript();

    const btn = document.getElementById('saveSettings');
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Settings'; }, 1500);
  });

  document.getElementById('exportConfig').addEventListener('click', exportConfig);
}

function exportConfig() {
  const config = { profiles, activeProfileId, settings, connection };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lattice-bridge-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Memory ─────────────────────────────────────────────
function renderMemory(entries) {
  const list = document.getElementById('memoryList');
  if (!entries || entries.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph">🜲</div>
        <div class="empty-text">No memories loaded.<br>Send a message to populate context.</div>
      </div>`;
    return;
  }

  list.innerHTML = entries.map((e, i) => `
    <div class="memory-entry">
      <div class="mem-id">MEM_${String(i+1).padStart(3,'0')} · ${escHtml(e.id || 'unknown')}</div>
      ${escHtml(e.text || e.content || JSON.stringify(e)).substring(0, 120)}…
    </div>
  `).join('');
}

// ── Server status ──────────────────────────────────────
async function checkServerStatus() {
  const port = connection.port || 31221;
  const token = connection.token || '';
  try {
    const res = await fetch(`http://localhost:${port}/ping`, {
      method: 'GET',
      headers: { 'x-identity-token': token },
      signal: AbortSignal.timeout(2000)
    });
    setStatusIndicator(res.ok);
  } catch {
    setStatusIndicator(false);
  }
}

function setStatusIndicator(online) {
  const dot = document.getElementById('serverStatusDot');
  const text = document.getElementById('serverStatusText');
  if (online) {
    dot.className = 'status-dot online';
    text.textContent = 'online';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'offline';
  }
}

// ── Notify content script ──────────────────────────────
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'CONFIG_UPDATED',
        activeProfileId,
        settings,
        connection
      }).catch(() => {});
    }
  } catch {}
}

// ── Utils ──────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
