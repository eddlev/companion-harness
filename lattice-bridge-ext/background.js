// Lattice Bridge — Background Service Worker (Secure Relay V2.5)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Lattice Bridge] Installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') { 
      sendResponse({ status: 'ok' }); 
      return; 
  }
  
  if (request.type === 'FETCH_RAG') {
    const fetchOptions = request.options || {};
    
    // STRICT SANITIZATION: Chrome's Service Worker will crash if a GET request 
    // even contains an empty 'body' property. We must physically delete it.
    if (fetchOptions.method === 'GET' || fetchOptions.method === 'HEAD') {
        delete fetchOptions.body;
    }

    fetch(request.url, fetchOptions)
      .then(async (res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        sendResponse({ success: true, data });
      })
      .catch(err => {
        console.error('[Bridge Background Error]', err);
        sendResponse({ success: false, error: err.toString() });
      });
    return true; // Keep message channel open for async response
  }
});