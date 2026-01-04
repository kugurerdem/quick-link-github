# Quick Link GitHub

## Project Overview

"Quick Link GitHub" is a browser extension (compatible with Firefox and Chrome) designed to simplify sharing GitHub Issues and Pull Requests. It allows users to quickly copy formatted links for various platforms and maintains a history of recently copied links.

**Key Features:**

-   **Context Awareness:** Detects if the current tab is a GitHub Issue or PR.
-   **Multiple Copy Formats:**
    -   **Markdown:** `[Title #123](url)`
    -   **Slack:** `<url|Title #123>`
    -   **Rich Text (Docs):** HTML link for Google Docs, MS Word, Outlook, etc.
-   **Copy Options:** Supports "Long" (Title + #ID), "Title Only", and "Short" (#ID) variations.
-   **History:** Persists a list of recently copied links using local storage.
-   **UI:** Clean, icon-based interface with tooltips for format details.

**Tech Stack:**

-   **Language:** Vanilla JavaScript (ES6+), HTML, CSS.
-   **Manifest Version:** 3.
-   **Dependencies:** `web-ext` (for running in Firefox), `prettier` (for formatting).

## Building and Running

### Prerequisites

-   Node.js and npm installed.

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
-   `style.css`: Main stylesheet. Uses CSS variables for spacing and colors.
-   `reset.css`: CSS reset.

### Key Logic (`index.js`)

-   **Initialization (`init`):** Queries the active tab to check if it's a GitHub page matching `pageUrlRegex`. Loads history from storage.
-   **URL Parsing:** Uses a regex that supports hash fragments and query parameters to correctly identify Issue/PR URLs.
-   **Copy Logic:**
    -   `onCopyClick` determines the format (MD, Slack, Docs) based on the button's `data-type`.
    -   `copyToClipboard` handles both `text/plain` and `text/html` (for Rich Text) copying.
-   **Icons:** SVG icons (including brand icons for Slack/Docs) are embedded directly as strings in JavaScript variables.