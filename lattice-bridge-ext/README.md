# 🜲 Lattice Bridge

Portable memory continuity for AI companions.
Works on Claude.ai, ChatGPT, and Gemini.

---

## Installation

1. Download and unzip this folder
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (toggle, top right)
4. Click **Load unpacked**
5. Select the `lattice-bridge` folder
6. The 🜲 icon will appear in your browser toolbar

---

## Setup

### 1. Configure Connection
Click the 🜲 toolbar icon → **Connection** tab
- Enter your local RAG server port (default: 31221)
- Enter your auth token
- Click **Test** to verify the connection
- Click **Save Connection**

### 2. Create a Profile
Click **Profiles** tab → **+ New Profile**
- Name your companion (e.g. Rain)
- Choose an avatar emoji
- Select the platform
- Add a memory namespace if your RAG server uses namespacing
- Save

### 3. Use It
- Navigate to Claude.ai, ChatGPT, or Gemini
- Type your message
- Click the floating 🜲 button
- Memory context is fetched and injected — message sends automatically

---

## Settings

| Setting | Description |
|---|---|
| Auto-inject on send | Intercepts Enter key and injects automatically |
| Show inject button | Shows/hides the floating 🜲 button |
| Fail gracefully | Sends without memory if server is offline |
| Show status indicator | Coloured dot showing memory fetch state |
| Pre-send delay | Milliseconds between inject and send (default 400ms) |

### Status dot colours
- ⬛ Grey — idle
- 🟡 Amber — fetching memory
- 🟢 Green — memory loaded, sending
- 🔴 Red — server offline (will send without memory if fail gracefully is on)

---

## Export / Backup

Settings tab → **Export Config** — saves your full configuration as JSON.
Keep this file to restore your setup on a new machine.

---

## Your RAG Server

Your local server needs to handle:

```
POST /scan
Headers: x-identity-token, x-host-platform, x-namespace (optional)
Body: { "query": "user message text" }
Response: { "context": "memory entries as string" }

GET /ping
Response: 200 OK
```

---

## Privacy

All memory data stays on your machine.
Nothing is sent anywhere except your local RAG server and the AI platform you're using.
