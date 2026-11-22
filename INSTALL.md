# Auto Fill Test Helper - Installation Guide

## First Time Installation

1. **Open Extensions Page**
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Browse to this directory (where `manifest.json` is located)
   - Click "Select"

4. **Pin for Easy Access**
   - Click the pin icon next to "Auto Fill Test Helper"
   - The extension will appear in your toolbar

## Testing the Extension

1. Open this HTML file in your browser
2. Click the extension icon
3. Choose your profile (Standard QA, Edge Case, etc.)
4. Select "Fill form" to test

## Setting Keyboard Shortcut

1. Go to `chrome://extensions/shortcuts`
2. From the list, click on "Auto Fill Test Helper"
3. In the input field, press your preferred key combination
   - Example: `Shift + Alt + F`
4. Save the shortcut

## Options Page

To configure settings:

**Method 1:** After using the extension once, click the **Settings** button in the popup

**Method 2:** Go to `chrome://extensions` - right-click on the extension card and select "Options"

**Method 3:** If using Chrome 114+, you can access the options directly in the sidebar

## Starting with the Extension

**Quick Start:**
- Use the popup to select a profile and fill forms
- Press `Alt+Shift+F` for quick fills without opening the popup
- Use Console API for automation: `window.autoFillTest({})`

**Advanced:**
- Go to Options page to configure profiles, locales, and rules
- Create custom profiles for specific test scenarios
- Export your configuration to share with teammates

## Troubleshooting

**Extension doesn't load:**
- Make sure you're on Chromium browser (Chrome 114+, Edge 114+)
- Ensure Developer mode is enabled

**Can't fill forms:**
- Refresh the page where the form is located
- Reload the extension in `chrome://extensions`
- Ensure "Fill custom widgets" is enabled if using Shadow DOM or custom components

**File URLs not working:**
- Go to `chrome://extensions`
- Click Details on Auto Fill Test Helper
- Enable "Allow access to file URLs"

**Not working on a specific site:**
- Check if the site has enabled security restrictions
- Try clearing cache and reloading the page
- Ensure you have the `activeTab` and `scripting` permissions for that origin

## Next Steps

1. ✅ Install and test basic functionality
2. ✅ Configure your preferred profile and keyboard shortcut
3. ✅ Try different locales to see regional data
4. ✅ Create custom profiles for specific use cases
5. ✅ Add custom rules to override default value generation
6. ✅ Set up automation with Console API
7. ✅ Export configuration and share with your team

## Getting Help

- Check the main README.md file for detailed documentation
- Use the Console API for debugging: `window.__AUTOFILL_DEBUG__.getFields()`
- Open DevTools (F12) to check for errors in the extension

---

**You're all set! Enjoy automated form filling for your QA testing workflows.** 🚀