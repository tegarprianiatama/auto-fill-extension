# Auto Fill Test Helper

Version 2.0 - Modern Manifest V3 browser extension for automated form filling and QA testing

## Features

- **Smart Form Filling** - Automatically fills web forms with synthetic test data
- **Profile System** - Choose from 4 built-in profiles (Standard QA, Edge Case, Minimal, International)
- **Advanced DOM Support** - Works with Shadow DOM, iframes, and custom widgets
- **Locale Support** - 6 regional locales (US, UK, DE, JP, BR, ES)
- **Context Aware Matching** - Intelligently matches fields by name, ID, placeholder, and labels
- **Keyboard Shortcut** - Quick fill with Alt+Shift+F
- **Console API** - Programmatically trigger fills from browser console
- **Custom Rules** - Per-field value overrides
- **Options Page** - Full configuration management
- **Export/Import** - Share configurations with your team

---

## Installation

### Load as Unpacked Extension

1. Open extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer mode** in top right

3. Click **Load unpacked** and select this directory

4. Confirm extension appears in your extensions list

---

## Usage

### Manual Filling

1. Open a web page with a form
2. Click extension icon in toolbar
3. Select a profile (Standard QA, Edge Case, Minimal, or International)
4. Choose fill mode:
   - **Empty fields only** - fills blank fields only
   - **Overwrite existing values** - replaces all values
5. Configure options if needed (required fields, auto-advance, fill file inputs, watch dynamic fields)
6. Click **Fill form**

### Options Page

Click **Settings** button in popup to access options page. Configure:
- Profiles and values
- Locale selection
- Fill behavior options
- Custom data rules
- Export/import configuration

### Quick Tasks

- **Test forms without popup**: Use keyboard shortcut (Alt+Shift+F)
- **Automated testing**: Use Console API: `window.autoFillTest({ mode: 'overwrite' })`
- **Multi-step forms**: Enable "Auto-advance" to click next buttons automatically
- **Custom fields**: Add rules via Options page for specific field values
- **Regional testing**: Switch profiles or locales to test different regions

---

## Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Fill form | Alt+Shift+F |

Configure additional shortcuts in: `chrome://extensions/shortcuts`

---

## Console API

Use from browser console (F12):

```javascript
// Basic fill with configured options
window.autoFillTest()

// Overwrite mode
window.autoFillTest({ mode: 'overwrite', requiredOnly: false })

// File inputs enabled
window.autoFillTest({ fillFileInputs: true })

// Multi-step form auto-advance
window.autoFillTest({ autoAdvance: true })
```

Debug helper available:
```javascript
window.__AUTOFILL_DEBUG__.getFields()  // List detected fields
window.__AUTOFILL_DEBUG__.getConfig()  // Get current configuration
```

---

## Development

### File Structure

```
auto-fill-extension/
├── manifest.json
├── background.js
├── src/
│   ├── storage.js   # Configuration management
│   ├── data.js      # Profiles and data
│   ├── content.js   # Main script
│   └── main-world.js # Console API
├── popup/           # Popup UI
└── options/         # Options page
```

### Loading Development Build

1. Enable Developer mode in `chrome://extensions/`
2. Click **Load unpacked**
3. Select `E:\Code\js\auto-fill-extension`

### Reloading After Changes

1. Go to `chrome://extensions/`
2. Click reload icon on extension card
3. Refresh test page (Ctrl+F5)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't fill | Reload extension, refresh form page |
| File URLs not working | Enable "Allow access to file URLs" in extension details |
| Cannot fill browser pages | Security restrictions prevent filling chrome://, edge:// etc |
| Shadow DOM not working | Ensure "Fill custom widgets" is enabled, check Console errors |

### Console for Debugging

Open Console (F12) on test page to check for errors:

```javascript
// Inspect detected fields
window.__AUTOFILL_DEBUG__.getFields()

// Check current configuration
window.__AUTOFILL_DEBUG__.getConfig()

// List all profiles
window.__AUTOFILL_DATA__?.profiles
```

---

## Profiles

### Standard QA
Balanced test data for general form filling
- Name: The user

### Edge Case
Long strings, special characters, and emoji to test constraints
- Name: Ærifðu; lastName: Ñoño-Максим

### Minimal
Characters that satisfy minimum requirements
- Values: Single character fields

### International
Regional test data for various countries
- US: San Francisco, CA, 94102, United States
- UK: London, England, SW1A 1AA, United Kingdom
- DE: München, Bayern, 80331, Deutschland
- JP: 東京都, 東京都, 100-0001, 日本
- BR: São Paulo, São Paulo, 01001-001, Brasil
- ES: Madrid, Madrid, 28001, España

---

## Options

Configure fill behavior, profiles, rules, and settings:

1. Open popup and click **Settings** button
2. Or access directly: `chrome://extensions/` → Right-click extension → Options

### Available Options

**Fill Mode**
- Empty fields only (default) - fill blank fields only
- Overwrite existing values - replace all values

**Behavior Settings**
- Required fields only - fill only required fields
- Auto-advance - click next/continue buttons in multi-step forms
- Fill file inputs - auto-generate test files
- Fill custom widgets - handle Shadow DOM and custom controls
- Watch dynamic fields - auto-re-fill newly added fields

**Localization**
- Locale: Select from 6 regional locales

**Profiles**
- Rename existing profiles or create new ones
- Update values for specific fields
- Delete custom profiles

**Data Rules**
- Add custom field-value mappings
- Override default behavior for specific inputs
- Priority over profile values

**Configuration Management**
- Export configuration to JSON
- Import configuration from JSON
- Reset all settings to defaults

---

## Browser Requirements

- Chrome 114+ (for side panel and all features)
- Microsoft Edge 114+
- Brave 114+
- Chromium 96+ (Manifest V3)

Almost all modern Chromium-based browsers are supported.