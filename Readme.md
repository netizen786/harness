# HARNESS | Autonomous Agent Console

## Architecture Summary
HARNESS is a 100% client-side Progressive Web App (PWA) that provides an AI agent with a terminal/chat UI, a Pyodide-based Python sandbox (running in a Web Worker), and web search capabilities. It uses Web Components for encapsulated UI, an event bus for decoupled communication, and a strict feature-flag/registry system to ensure all future capabilities (remote browser, local file system access) can be added as drop-in modules without refactoring existing code.

## Feature Flag Table
| Flag | Default | Unlocks | Stub Location |
|---|---|---|---|
| `search` | `true` | `search_web` tool, Tavily API integration | N/A (Implemented) |
| `pythonSandbox` | `true` | `run_python` tool, Pyodide worker | N/A (Implemented) |
| `remoteBrowser` | `false` | `browse_url` tool | `/src/core/remote-browser.stub.js` |
| `localFolder` | `false` | `open_local_folder`, `local_read/write` | `/src/core/fs-access.stub.js` |

## How to Add Feature X

### 1. Adding a new Tool
1. Create the handler logic (e.g., `/src/core/my-new-tool.js`).
2. In `/src/core/registry.js`, call `registerTool({ name: 'my_tool', description: '...', schema: {...}, handler: myHandler, enabledByFlag: 'myFeature' })`.
3. The AI tool-call loop in `ai-api.js` will automatically pick it up if the flag is true. No other files change.

### 2. Adding a Search Provider
1. In `/src/core/search-api.js`, add a new key to the `providers` map (e.g., `brave: async (query) => { ... }`).
2. Change the `activeProvider` variable or make it dynamic via `store.js` settings.

### 3. Replacing a Stub with Real Implementation
1. Create the real file (e.g., `/src/core/fs-access.js`) exporting the exact same function signatures as the stub.
2. In `/src/core/flags.js`, flip the corresponding flag to `true`.
3. Update `registry.js` to import from the new file instead of the `.stub.js` file.
4. Delete the `.stub.js` file.

### 4. Adding a UI Panel
1. Create a new Web Component in `/src/ui/my-panel.js` using the shadow DOM and CSS tokens.
2. Import and register it in `/src/ui/app-shell.js`.
3. Gate its rendering with a check against `FEATURES.myFeature` if applicable.

## Local Development & PWA Installation
1. **Run locally**: You cannot use `file://` due to ES modules and Service Worker restrictions. Run:
   ```bash
   npx serve -s .