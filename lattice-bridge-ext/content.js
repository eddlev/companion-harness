const SERVER_PORT = 31221;
const AUTH_TOKEN = "BlueUmbrella";
const platform = window.location.hostname.includes('claude') ? 'claude' : 'chatgpt';
let isProcessing = false;
let lastHarvestedAI = "";

console.log(`[Lattice Bridge] Extension loaded for ${platform.toUpperCase()}`);

// --- VISUAL INDICATOR (A tiny dot in the bottom right corner) ---
const statusDot = document.createElement('div');
statusDot.id = 'lattice-status';
statusDot.style.cssText = 'position: fixed; bottom: 20px; right: 20px; width: 12px; height: 12px; border-radius: 50%; z-index: 10000; background: #444; transition: background 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.5); pointer-events: none;';
document.body.appendChild(statusDot);

function setStatus(state) {
    if (state === 'idle') statusDot.style.background = '#444'; // Grey
    if (state === 'loading') statusDot.style.background = '#f0a500'; // Amber
    if (state === 'ready') statusDot.style.background = '#00c896'; // Green
    if (state === 'offline') statusDot.style.background = '#c83232'; // Red
}

// --- THE INJECTION ENGINE (Claude's Safe Method) ---
async function handleInjection(rawText, editor) {
    if (isProcessing) return;
    isProcessing = true;
    setStatus('loading');

    try {
        // Fetch Memory
        const response = await fetch(`http://localhost:${SERVER_PORT}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-identity-token': AUTH_TOKEN, 'x-host-platform': platform },
            body: JSON.stringify({ query: rawText })
        });

        const data = await response.json();
        const memoryContext = data.context || '';
        const finalPayload = memoryContext ? `<lattice_context>\n${memoryContext}\n</lattice_context>\n\n${rawText}` : rawText;

        // Inject visibly into input so React acknowledges it
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, finalPayload);
        
        setStatus('ready');

        // Pause briefly to let React's state update, then send
        setTimeout(() => {
            const sendBtn = platform === 'claude' 
                ? (document.querySelector('button[aria-label="Send Message"]') || editor.closest('fieldset')?.querySelector('button:last-of-type'))
                : document.querySelector('button[data-testid="send-button"]');
            
            if (sendBtn && !sendBtn.disabled) sendBtn.click();
            setStatus('idle');
            setTimeout(() => { isProcessing = false; }, 1000);
        }, 400);

    } catch (err) {
        console.warn('[Lattice Bridge] Vault Unreachable.', err);
        setStatus('offline');
        
        // Fallback: If local server is offline, just send the raw text normally
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, rawText);
        setTimeout(() => {
            const sendBtn = document.querySelector('button[aria-label="Send Message"]');
            if (sendBtn) sendBtn.click();
            setStatus('idle');
            isProcessing = false;
        }, 400);
    }
}

// --- THE AUTOMATOR (Global Enter Key Intercept) ---
window.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const editor = platform === 'claude' ? document.querySelector('.ProseMirror') : document.querySelector('#prompt-textarea');
        
        if (!editor || !editor.contains(document.activeElement)) return;

        const rawText = editor.textContent.trim();
        if (!rawText) return;

        // STOP NATIVE SEND
        e.preventDefault();
        e.stopImmediatePropagation();

        // Trigger our automated memory flow
        handleInjection(rawText, editor);
    }
}, true); 

// --- THE HARVESTER (Background Loop) ---
setInterval(() => {
    const aiSelector = platform === 'claude' ? '.font-claude-message' : '[data-message-author-role="assistant"]';
    const userSelector = platform === 'claude' ? '.font-user-message' : '[data-message-author-role="user"]';
    
    const aiMessages = document.querySelectorAll(aiSelector);
    const userMessages = document.querySelectorAll(userSelector);
    
    if (aiMessages.length === 0 || userMessages.length === 0) return;

    let lastAIText = aiMessages[aiMessages.length - 1].innerText || aiMessages[aiMessages.length - 1].textContent;
    let lastUserText = userMessages[userMessages.length - 1].innerText || userMessages[userMessages.length - 1].textContent;

    lastAIText = lastAIText.trim();
    lastUserText = lastUserText.replace(/<lattice_context>[\s\S]*?<\/lattice_context>/g, '').trim();

    const stopBtn = document.querySelector('button[aria-label="Stop generating"]');
    
    if (lastAIText && lastAIText !== lastHarvestedAI && !stopBtn && !isProcessing) {
        lastHarvestedAI = lastAIText;
        fetch(`http://localhost:${SERVER_PORT}/harvest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-identity-token': AUTH_TOKEN, 'x-host-platform': platform },
            body: JSON.stringify({ userText: lastUserText, aiText: lastAIText })
        }).catch(() => {});
    }
}, 3000);