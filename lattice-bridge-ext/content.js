// Lattice Bridge — Content Script (V2.4 Direct Target Build)
console.log("🔥 LATTICE BRIDGE: SCRIPT INJECTED AND AWAKE 🔥");

let config = {
  activeProfileId: null,
  settings: { autoInject: false, showBtn: true, failGraceful: true, showStatus: true, injectDelay: 400, remindInterval: 8 },
  connection: { port: 31221, token: '', claudeSelector: 'textarea[data-testid="chat-input-tsr"], .ProseMirror', chatgptSelector: '#prompt-textarea' },
  profiles: []
};

const platform = (() => {
  const h = window.location.hostname;
  if (h.includes('claude.ai')) return 'claude';
  if (h.includes('chatgpt.com')) return 'chatgpt';
  if (h.includes('gemini.google.com')) return 'gemini';
  return 'unknown';
})();

const session = { booted: false, turnCount: 0, bootCache: null };
let currentActiveEditor = null;

async function loadConfig() {
  const data = await chrome.storage.local.get(['profiles', 'activeProfileId', 'settings', 'connection']);
  if (data.profiles) config.profiles = data.profiles;
  if (data.activeProfileId) config.activeProfileId = data.activeProfileId;
  if (data.settings) config.settings = { ...config.settings, ...data.settings };
  if (data.connection) config.connection = { ...config.connection, ...data.connection };
  applyConfig();
}

function applyConfig() {
  config.settings.showBtn ? ensureFloatingBtn() : removeFloatingBtn();
  config.settings.showStatus ? ensureStatusDot() : removeStatusDot();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CONFIG_UPDATED') {
    const prevProfile = config.activeProfileId;
    if (msg.activeProfileId) config.activeProfileId = msg.activeProfileId;
    if (msg.settings) config.settings = { ...config.settings, ...msg.settings };
    if (msg.connection) config.connection = { ...config.connection, ...msg.connection };
    applyConfig();
    if (msg.activeProfileId && msg.activeProfileId !== prevProfile) resetSession();
  }
  if (msg.type === 'INJECT_NOW') handleInject();
  if (msg.type === 'RESET_SESSION') resetSession();
});

function resetSession() { session.booted = false; session.turnCount = 0; session.bootCache = null; }
function shouldInjectFull() { return !session.booted; }
function shouldInjectRemind() {
  const interval = config.settings.remindInterval || 8;
  return session.booted && session.turnCount > 0 && (session.turnCount % interval === 0);
}

let floatingBtn = null;
let statusDot = null;
let isProcessing = false;

function ensureFloatingBtn() {
  if (!document.getElementById('lattice-float-btn')) {
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'lattice-float-btn';
    floatingBtn.innerHTML = '🜲';
    floatingBtn.title = 'Inject memory context';
    document.documentElement.appendChild(floatingBtn);
    floatingBtn.addEventListener('click', handleInject);
  }
}
function removeFloatingBtn() { if (floatingBtn) { floatingBtn.remove(); floatingBtn = null; } }

function ensureStatusDot() {
  if (!document.getElementById('lattice-status-dot')) {
    statusDot = document.createElement('div');
    statusDot.id = 'lattice-status-dot';
    statusDot.className = 'idle';
    document.documentElement.appendChild(statusDot);
  }
}
function removeStatusDot() { if (statusDot) { statusDot.remove(); statusDot = null; } }

function setStatus(state) {
  const dot = document.getElementById('lattice-status-dot');
  if (dot) dot.className = state;
}

// Aggressive UI enforcement
setInterval(() => {
  if (config.settings.showStatus) ensureStatusDot();
  if (config.settings.showBtn) ensureFloatingBtn();
}, 1000);

// ── DIRECT TARGET KEY INTERCEPTOR ──
document.addEventListener('keydown', (e) => {
  if (!config.settings.autoInject) return;
  if (e.key !== 'Enter' || e.shiftKey) return;
  
  // Grab the exact container surrounding the cursor right now
  const targetEditor = e.target.closest('[contenteditable="true"]') || e.target.closest('.ProseMirror') || e.target.closest('textarea');
  
  if (!targetEditor) return; // If they aren't typing in an editor, ignore it.
  
  console.log("🔥 LATTICE BRIDGE: Enter Key Intercepted on Target! 🔥");
  e.preventDefault();
  e.stopImmediatePropagation();
  
  currentActiveEditor = targetEditor;
  handleInject();
}, true);

async function handleInject() {
  if (isProcessing) return;
  
  const editor = currentActiveEditor || getEditor();
  if (!editor) {
      console.warn("🔥 LATTICE BRIDGE: Abort - Could not find editor element.");
      return;
  }
  
  const rawText = getEditorText(editor);
  if (!rawText) {
      console.warn("🔥 LATTICE BRIDGE: Abort - Editor text is empty. Did you type anything?");
      return;
  }

  console.log(`🔥 LATTICE BRIDGE: Injecting Payload. Detected text: "${rawText.substring(0, 30)}..." 🔥`);
  isProcessing = true;
  setStatus('loading');

  try {
    if (!session.bootCache) session.bootCache = await fetchBoot();
    const scanContext = await fetchScan(rawText);
    
    let bootLayer = '';
    if (shouldInjectFull()) bootLayer = session.bootCache?.full || '';
    else if (shouldInjectRemind()) bootLayer = session.bootCache?.remind || '';

    const activeProfile = config.profiles?.find(p => p.id === config.activeProfileId);
    const namespace = activeProfile?.namespace || '';
    const parts = [];

    if (bootLayer) parts.push(`<lattice_boot>\n${bootLayer}\n</lattice_boot>`);
    if (scanContext) parts.push(`<lattice_context${namespace ? ` namespace="${namespace}"` : ''}>\n${scanContext}\n</lattice_context>`);
    parts.push(rawText);

    const finalPayload = parts.join('\n\n');
    await setEditorText(editor, finalPayload);
    setStatus('ready');

    session.booted = true;
    session.turnCount++;
    chrome.storage.local.set({ lastMemory: parseMemoryEntries(scanContext) });

    setTimeout(() => {
      clickSend();
      setStatus('idle');
      isProcessing = false;
      currentActiveEditor = null;
    }, config.settings.injectDelay || 400);

  } catch (err) {
    console.warn('[Lattice Bridge] Error:', err);
    if (config.settings.failGraceful) {
      setStatus('offline');
      session.turnCount++; 
      clickSend();
      setTimeout(() => { setStatus('idle'); isProcessing = false; currentActiveEditor = null; }, 1500);
    } else {
      setStatus('offline');
      isProcessing = false;
      currentActiveEditor = null;
    }
  }
}

// ── Secure Background Fetch Routing ─────────────────────
async function backgroundFetch(endpoint, method, body = null) {
  const { port, token } = config.connection;
  const activeProfile = config.profiles?.find(p => p.id === config.activeProfileId);
  const headers = {
    'Content-Type': 'application/json',
    'x-identity-token': token,
    'x-host-platform': platform,
    ...(activeProfile?.namespace ? { 'x-namespace': activeProfile.namespace } : {})
  };
  const options = { method, headers, cache: 'no-store' };
  if (body) options.body = JSON.stringify(body);

  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_RAG',
    url: `http://localhost:${port}${endpoint}`,
    options: options
  });

  if (!response || !response.success) throw new Error(response?.error || 'Background fetch failed');
  return response.data;
}

async function fetchBoot() {
  const data = await backgroundFetch('/boot', 'GET');
  return { full: data.full || '', remind: data.remind || '' };
}

async function fetchScan(query) {
  const data = await backgroundFetch('/scan', 'POST', { query });
  return data.context || '';
}

// ── DOM Handling (Fallback) ─────────────────
function getEditor() {
  if (platform === 'claude') {
    return document.querySelector('div[data-testid="chat-input-tsr"]') || 
           Array.from(document.querySelectorAll('.ProseMirror')).pop() ||
           document.querySelector('div[contenteditable="true"]');
  }
  if (platform === 'chatgpt') return document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
  if (platform === 'gemini') return document.querySelector('rich-textarea .ql-editor') || document.querySelector('[contenteditable="true"]');
  
  return document.querySelector('[contenteditable="true"]');
}

function getEditorText(editor) { 
  if (editor.tagName === 'TEXTAREA') return editor.value.trim();
  return editor.textContent?.trim() || ''; 
}

async function setEditorText(editor, text) {
  editor.focus();
  
  if (editor.tagName === 'TEXTAREA') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    nativeInputValueSetter.call(editor, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }
  
  await new Promise(r => setTimeout(r, 50));
}

function clickSend() {
  if (platform === 'claude') {
    const btn = document.querySelector('button[aria-label="Send Message"]') || document.querySelector('button[data-testid="send-button"]') || document.querySelector('button:has(svg)');
    if (btn && !btn.disabled) btn.click();
  } else if (platform === 'chatgpt') {
    const btn = document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[aria-label="Send prompt"]');
    if (btn && !btn.disabled) btn.click();
  } else if (platform === 'gemini') {
    const btn = document.querySelector('button[aria-label="Send message"]') || document.querySelector('.send-button');
    if (btn && !btn.disabled) btn.click();
  }
}

// ── Scrubber ────────────────────────────────────────────
const SCRUB_PATTERN = /<lattice_(boot|context)[^>]*>[\s\S]*?<\/lattice_(boot|context)>\s*/g;

function scrubSentBubble(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  SCRUB_PATTERN.lastIndex = 0;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    SCRUB_PATTERN.lastIndex = 0;
    if (SCRUB_PATTERN.test(textNode.textContent)) {
      SCRUB_PATTERN.lastIndex = 0;
      textNode.textContent = textNode.textContent.replace(SCRUB_PATTERN, '').trimStart();
    }
  }
  SCRUB_PATTERN.lastIndex = 0;
  if (node.innerHTML && SCRUB_PATTERN.test(node.innerHTML)) {
    SCRUB_PATTERN.lastIndex = 0;
    node.innerHTML = node.innerHTML.replace(SCRUB_PATTERN, '').trimStart();
  }
}

function getSentMessageSelector() {
  if (platform === 'claude') return '[data-testid="user-message"], .font-user-message, [class*="human-turn"]';
  if (platform === 'chatgpt') return '[data-message-author-role="user"]';
  if (platform === 'gemini') return '.user-query-bubble-with-background, .user-message';
  return null;
}

function startScrubObserver() {
  const selector = getSentMessageSelector();
  if (!selector) return;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(selector)) scrubSentBubble(node);
        node.querySelectorAll?.(selector).forEach(scrubSentBubble);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function parseMemoryEntries(context) {
  if (!context) return [];
  return context.split('\n').filter(l => l.trim()).slice(0, 10).map((line, i) => ({ id: `entry_${i}`, text: line }));
}

loadConfig();
startScrubObserver();