# Auto Fill Test Helper

A Manifest V3 browser extension that generates synthetic test values and fills common web form fields on demand.

## Phase 1 foundation

- Manual popup action for filling forms in the active tab.
- Empty-fields-only and overwrite modes.
- Optional required-fields-only mode.
- Content script that fills visible, editable native inputs, textareas, and selects.
- Synthetic default data for common testing fields such as names, email, phone, address, company, URL, and dates.
- Input and change events are dispatched after filling so framework-controlled forms can react to updates.

## Load locally

1. Open `chrome://extensions` in Chrome or a Chromium-based browser.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository directory.
5. Open a page with a form and click the extension action.
