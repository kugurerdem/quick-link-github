# Quick Link GitHub

## Project Overview
"Quick Link GitHub" is a browser extension (compatible with Firefox and Chrome) designed to simplify sharing GitHub Issues and Pull Requests. It allows users to quickly copy formatted Markdown links (e.g., `[Title #123](url)`) and maintains a history of recently copied links.

**Key Features:**
- Detects if the current tab is a GitHub Issue or PR.
- Generates "Long" (Title + #ID) and "Short" (#ID) Markdown links.
- Persists a history of copied links using local storage.
- Simple, clean UI.

**Tech Stack:**
- **Language:** Vanilla JavaScript (ES6+), HTML, CSS.
- **Manifest Version:** 3.
- **Dependencies:** `web-ext` (for running in Firefox), `prettier` (for formatting).

## Building and Running

### Prerequisites
- Node.js and npm installed.

### Setup
1.  Install dependencies:
    ```bash
    npm install
    ```

### Development Server / Running
-   **Firefox:**
    Run the extension in a temporary Firefox instance with auto-reload:
    ```bash
    npm run start:firefox
    ```

-   **Chrome / Edge / Brave:**
    1.  Open `chrome://extensions/`.
    2.  Enable "Developer mode" (toggle in top right).
    3.  Click "Load unpacked".
    4.  Select the project root directory (`quick-link-github`).

### Linting
Check for formatting issues:
```bash
npm run lint
```
Fix formatting issues:
```bash
npm run lint:fix
```

## Development Conventions

### File Structure
-   `manifest.json`: The extension manifest (V3). Defines permissions (`activeTab`, `storage`), icons, and the popup (`index.html`).
-   `index.html`: The main entry point for the extension popup.
-   `index.js`: Contains all the application logic.
    -   **State Management:** Uses a simple global `state` object.
    -   **Rendering:** Functional-style components (e.g., `App`, `CopyFromThisPage`) return HTML strings which are injected into the DOM via `innerHTML`.
    -   **Storage:** Uses `chrome.storage.local` to save the history of copied links.
-   `style.css`: Main stylesheet.
-   `reset.css`: CSS reset.

### Key Logic (`index.js`)
-   **Initialization (`init`):** Queries the active tab to check if it's a GitHub page matching `pageUrlRegex`. Loads history from storage.
-   **Parsing:** Extracts Repo Name, Issue/PR Number, and Title from the page title and URL.
-   **Event Handling:** Listeners are re-attached after every `render()` call.
-   **Icons:** SVG icons are embedded directly as strings in JavaScript variables.
