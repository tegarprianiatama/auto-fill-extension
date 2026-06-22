# Auto Fill Test Helper

A Manifest V3 browser extension that generates synthetic test values and fills common web form fields on demand.

## Phase 1 foundation

- Manual popup action for filling forms in the active tab.
- Empty-fields-only and overwrite modes.
- Optional required-fields-only mode.
- Content script that fills visible, editable native inputs, textareas, and selects.
- Synthetic default data for common testing fields such as names, email, phone, address, company, URL, and dates.
- Input and change events are dispatched after filling so framework-controlled forms can react to updates.

## Run locally

This extension does not require a build step for Phase 1. Load the repository directly as an unpacked extension in a Chromium-based browser.

### Prerequisites

- Google Chrome, Microsoft Edge, Brave, or another Chromium-based browser.
- The repository cloned or available on your local machine.

### Load the unpacked extension

1. Open the browser extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository root directory, the folder that contains `manifest.json`.
5. Confirm that **Auto Fill Test Helper** appears in the extensions list.
6. Pin the extension from the browser toolbar if you want quick access.

### Try it on a local form

1. Create a temporary file named `test-form.html` anywhere on your machine.
2. Paste this sample form into the file:

   ```html
   <!doctype html>
   <html lang="en">
     <body>
       <form>
         <label>First name <input name="first_name" required /></label>
         <label>Last name <input name="last_name" required /></label>
         <label>Email <input type="email" name="email" required /></label>
         <label>Phone <input type="tel" name="phone" /></label>
         <label>Company <input name="company" /></label>
         <label>Start date <input type="date" name="start_date" /></label>
         <label>Team size <input type="number" name="team_size" min="1" max="20" /></label>
         <label>Notes <textarea name="notes"></textarea></label>
         <button type="submit">Submit</button>
       </form>
     </body>
   </html>
   ```

3. Open the file in the same browser where the extension is loaded.
4. Click the **Auto Fill Test Helper** toolbar icon.
5. Choose a fill mode:
   - **Empty fields only** keeps existing manual input and fills only blank fields.
   - **Overwrite existing values** replaces current field values with generated test data.
6. Optionally enable **Required fields only** to skip optional fields.
7. Click **Fill form**.

### Reload after local changes

When you edit extension files locally:

1. Return to the browser extensions page.
2. Find **Auto Fill Test Helper**.
3. Click the reload icon for the unpacked extension.
4. Refresh the page that contains the form before testing again.

### Troubleshooting

- Browser internal pages such as `chrome://settings` cannot be filled by content scripts.
- If the popup reports that the page cannot be filled, refresh the target page after reloading the extension.
- For local `file://` forms, enable **Allow access to file URLs** for the extension on the browser extensions page.
- The Phase 1 implementation targets native inputs, textareas, and selects. Advanced custom controls, shadow DOM fields, and multi-step workflows are planned for later phases.