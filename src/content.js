// Enhanced content script with advanced DOM handling
// Listens for fill requests and fills forms intelligently

importScripts('../src/storage.js');
importScripts('../src/data.js');

const FIELD_SELECTORS = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select'
].join(',');

// State
let config = {};
let watchObserver = null;
let dynamicFillTimeout = null;

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'AUTO_FILL_FORM') {
    fillForm(message.options || {})
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message?.type === 'SET_WATCH') {
    config.watchDynamic = message.watch;
    updateWatchMode();
    return true;
  }

  if (message?.type === 'SET_OPTIONS') {
    config = message.options || config;
    return true;
  }

  return false;
});

async function fillForm(options = {}) {
  const mergedOptions = { ...config, ...options };

  // Get fields using all strategies
  const fields = gatherFields(document.body);
  console.log('Found', fields.length, 'fields');

  let filledCount = 0;
  let autoAdvanced = false;

  // Map for tracking filled paired fields
  const filledPairs = new Map();

  try {
    // Fill static fields first
    for (const field of fields) {
      const autoAdvanceBtn = mergedOptions.autoAdvance ? findAutoAdvanceButton() : null;
      if (autoAdvanceBtn) {
        const actionTaken = await tryAutoAdvance(autoAdvanceBtn);
        if (actionTaken) {
          autoAdvanced = true;
          // Refresh field list after auto-advance
          fields.length = 0;
          fields.push(...gatherFields(document.body));
        }
      }

      if (shouldFillField(field, mergedOptions, filledPairs)) {
        const value = generateValueForField(field, { mergedOptions.data, rules: mergedOptions.rules, filledPairs });
        if (value !== undefined && value !== null) {
          if (applyValue(field, value)) {
            filledCount++;
          }
        }
      }
    }

    // Fill file inputs if enabled
    if (mergedOptions.fillFileInputs) {
      await fillFileInputs(fields, filledPairs);
    }

    // Return result
    return {
      filledCount,
      skipped: fields.length - filledCount,
      configOverride: mergedOptions
    };
  } catch (error) {
    console.error('Form fill error:', error);
    throw error;
  }
}

// Gather fields from document and all shadow roots and iframes
function gatherFields(root) {
  const fields = new Set();

  // Helper to recurse
  const walk = (element) => {
    if (!element || !element.shadowRoot) return;

    // Walk through shadow DOM
    let current = element.shadowRoot;
    while (current) {
      const elements = current.querySelectorAll(FIELD_SELECTORS);
      elements.forEach(el => fields.add(convertNode(el)));
      current = walkIntoNextShadow(current);
    }
  };

  // Walk into next shadow root
  const walkIntoNextShadow = (node) => {
    if (!node) return null;
    if (node === node.parentNode) return null; // Stop at bottom

    // Check for adaptable slot
    if (node.assignedSlot && node.assignedSlot.parentNode) {
      return node.assignedSlot.parentNode instanceof ShadowRoot ? node.assignedSlot.parentNode : null;
    }

    // Check for child with shadow root
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.shadowRoot) {
        return child.shadowRoot;
      }
    }

    return walkIntoNextShadow(node.parentNode);
  };

  // Collect native fields
  const elements = root.querySelectorAll(FIELD_SELECTORS);
  elements.forEach(el => fields.add(convertNode(el)));

  // Walk shadow DOM from any element
  const hostElements = root.querySelectorAll('*');
  hostElements.forEach(host => {
    const el = convertNode(host);
    if (el.shadowRoot) {
      walk(el);
    }
  });

  // Try to access same-origin iframes
  const iframes = root.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (iframe.contentWindow && iframe.contentDocument) {
      try {
        const iframeFields = gatherFields(iframe.contentDocument.body);
        iframeFields.forEach(f => fields.add(f));
      } catch (e) {
        // Cross-origin iframe - skip
        console.log('Skipping cross-origin iframe', iframe.src);
      }
    }
  });

  return Array.from(fields);
}

// Convert any node to HTMLElement safely
function convertNode(node) {
  if (!node || !node.nodeType === 1) return null;
  const element = node;

  // Get actual DOM element values (work around framework wrappers)
  if (element._reactProps || element._reactInternalInstance) {
    // React wrapper - access underlying element
    let underlying = element;
    while (underlying?.firstChild) {
      underlying = underlying.firstChild;
    }
    if (underlying?.nodeType === 1) return underlying;
  }

  return element;
}

function shouldFillField(field, options, filledPairs) {
  if (!(field instanceof HTMLElement)) return false;

  // Check visibility and disabled state
  if (field.disabled || field.readOnly || !isVisible(field)) return false;

  // Check required fields only
  if (options.requiredOnly && !field.required && field.getAttribute('aria-required') !== 'true') {
    return false;
  }

  // Check mode (empty vs overwrite)
  if (options.mode !== 'overwrite' && hasValue(field)) return false;

  // Skip checkboxes/radios already checked in value generation
  if (field.type === 'checkbox' || field.type === 'radio') {
    const existingChecked = field.checked;
    if (options.mode === 'empty' && existingChecked) return false;
  }

  return true;
}

function generateValueForField(field, ctx) {
  // Check custom rules first
  for (const rule of ctx.rules) {
    const matchRegex = rule.match.startsWith('/') && rule.match.endsWith('/')
      ? new RegExp(rule.match.slice(1, -1))
      : new RegExp(rule.match, 'i');
    if (matchRegex.test(field.name || '') || matchRegex.test(field.id) || matchRegex.test(field.placeholder || '')) {
      return rule.value;
    }
  }

  // Check for paired fields (e.g., confirm email)
  const signature = fieldSignature(field);
  if (ctx.filledPairs) {
    for (const [key, value] of ctx.filledPairs) {
      const reverseSignature = getReverseSignature(key);
      if (reverseSignature && signature.includes(reverseSignature.toLowerCase())) {
        return value;
      }
    }
  }

  // Determine value based on field type
  if (field.hasAttribute('data-autofill-ignore')) {
    return undefined;
  }

  return AutoFillData.generateValue(field, ctx);
}

function getReverseSignature(dataKey) {
  const reverseSignatureData = {
    firstName: ['first', 'given', 'fname', '昵'],
    lastName: ['last', 'family', 'surname', '上一'],
    fullName: ['name', '姓名'],
    company: ['company', 'organisation', 'company', '公司'],
    email: ['email'],
    phone: ['phone', 'tel', 'phone', '电话'],
    address: ['address', 'street', '地址'],
    city: ['city', 'city', '城市'],
    state: ['state', 'province', 'state', '州'],
    country: ['country', 'country'],
    url: ['url', 'website', 'site', 'website', '网站'],
    username: ['user', 'username', '账号', '用户名'],
    date: ['date', '日期'],
    password: ['password', '密码'],
    confirmPassword: ['confirm', 'confirm-password', 'confirm_password']
  };

  return reverseSignatureData[dataKey]?.[0];
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return !!(style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           rect.width > 0 &&
           rect.height > 0);
}

function hasValue(field) {
  if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type)) {
    return field.checked;
  }
  return 'value' in field && field.value.trim() !== '';
}

function applyValue(field, value) {
  // Handle checkbox/radio
  if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type)) {
    field.checked = Boolean(value);
    attemptRadioGroupSync(field);
  }
  // Handle file inputs
  else if (field.type === 'file') {
    // Handled separately
    return false;
  }
  // Handle native values
  else if ('value' in field) {
    const handled = setNativeValue(field, value);
    if (handled) {
      // Track filled paired fields
      const signature = fieldSignature(field);
      const dataKey = findDataKeyBySignature(signature);
      if (dataKey && value !== undefined) {
        filledPairs.set(signature, value);
      }
    }
    return handled;
  }
  // Checkboxes needed to be sent as 'handled' if apply generic value
  else if (field.type === 'checkbox') {
    field.checked = Boolean(value);
    return true;
  }

  return false;
}

function attemptRadioGroupSync(radio) {
  if (radio.type !== 'radio') return;
  const group = radio.name ? document.getElementsByName(radio.name) : [];
  if (group.length === 0) return;

  // Ensure at least one radio in group is checked
  let anyChecked = Array.from(group).some(r => r.checked);
  if (!anyChecked) {
    const firstEnabled = Array.from(group).find(r => !r.disabled);
    if (firstEnabled) firstEnabled.checked = true;
  }
}

function findDataKeyBySignature(signature) {
  const reverseSignatureData = {
    firstName: ['first', 'given', 'fname', '昵'],
    lastName: ['last', 'family', 'surname', '上一'],
    fullName: ['name', '姓名'],
    company: ['company', 'company', 'company', 'company', '公司'],
    email: ['email'],
    phone: ['phone', 'phone', 'tel', 'phone', '电话'],
    address: ['address', 'address', 'street', '地址'],
    city: ['city', 'city', 'city', 'city', '城市'],
    state: ['state', 'state', 'province', 'state', '州'],
    country: ['country', 'country'],
    url: ['url', 'website', 'site', '网站'],
    username: ['user', 'username', '账号', '用户名'],
    date: ['date', '日期'],
    password: ['password', 'password', '密码']
  };

  for (const [key, signatures] of Object.entries(reverseSignatureData)) {
    if (signatures.some(s => signature.includes(s))) {
      return key;
    }
  }
  return null;
}

function setNativeValue(field, value) {
  const prototype = Object.getPrototypeOf(field);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  try {
    // First try the native descriptor method
    if (descriptor?.set) {
      descriptor.set.call(field, value);
    } else {
      field.value = value;
    }
  } catch (e) {
    try {
      // Fallback using prototype chain
      field.value = value;
    } catch (err) {
      console.warn('Could not set value on field:', field);
      return false;
    }
  }

  return true;
}

function fieldSignature(field) {
  const label = labelTextFor(field);
  return [
    field.type,
    field.name || '',
    field.id || '',
    field.placeholder || '',
    field.getAttribute('aria-label') || '',
    label,
    field.getAttribute('autocomplete') || '',
    field.getAttribute('data-field-type') || '',
    field.role || ''
  ].filter(Boolean).join(' ').toLowerCase();
}

function labelTextFor(field) {
  if (field.id) {
    const explicitLabel = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    if (explicitLabel) return explicitLabel.textContent?.trim() ?? '';
  }
  return field.closest('label')?.textContent?.trim() ?? '';
}

function firstSelectableOption(select) {
  const options = Array.from(select.options);
  const enabled = options.filter(opt => !opt.disabled && opt.value !== '');
  return enabled[0]?.value;
}

function numberWithinRange(field) {
  const min = field.min === '' ? 1 : Number(field.min);
  const max = field.max === '' ? 42 : Number(field.max);
  if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
    return String(Math.floor((min + max) / 2));
  }
  return '42';
}

async function findAutoAdvanceButton() {
  const candidateTexts = /next|continue|proceed|validate|submit/i;
  const buttons = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button, a'));
  return buttons.find(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    return candidateTexts.test(text) && isVisible(btn);
  });
}

async function tryAutoAdvance(button) {
  if (!button || !isVisible(button)) return false;

  try {
    // Try to get the underlying DOM element if wrapped by framework
    let element = button;
    while (element?.firstChild) {
      element = element.firstChild;
    }
    if (element?.nodeType === 1) element = element.parentElement;

    element?.scrollIntoView({ behavior: 'smooth' });
    await sleep(100);

    setNativeValue(element, element);

    // Dispatch events in order to trigger framework handlers
    element.dispatchEvent(new Event('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('mouseup', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  } catch (e) {
    console.warn('Auto-advance failed:', e);
    return false;
  }
}

async function fillFileInputs(fields, filledPairs) {
  const fileFieldTypes = ['input[type="file"]', 'input[data-type="file"]', '[role="file"]'];
  const fileFields = fields.filter(f =>
    fileFieldTypes.some(selector => f.matches && f.matches(selector))
  );

  for (const field of fileFields) {
    try {
      const accept = field.accept || '*';
      // Create a small text file for text files, or a tiny PNG for images
      let content, fileName, mimeType;

      const textAccepts = ['text/*', 'application/json', '.txt', '.csv', '.md', 'application/pdf'];
      const imageAccepts = ['image/*', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const audioAccepts = ['audio/*', '.mp3', '.wav', '.ogg'];
      const videoAccepts = ['video/*', '.mp4', '.webm'];

      const lowerAccept = accept.toLowerCase();
      if (textAccepts.some(t => lowerAccept.includes(t))) {
        content = 'This is a synthetic test file.\nGenerated by Auto Fill Test Helper';
        fileName = 'test-file.txt';
        mimeType = 'text/plain';
      } else if (imageAccepts.some(t => lowerAccept.includes(t))) {
        // Create 1x1 PNG
        const pngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        response = await fetch(pngUrl);
        content = await response.blob();
        fileName = 'test-image.png';
        mimeType = 'image/png';
      } else {
        content = 'test-file.txt';
        fileName = 'test-file.txt';
        mimeType = 'text/plain';
      }

      const file = new File([content], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      field.files = dataTransfer.files;

      // Trigger change event
      field.dispatchEvent(new Event('change', { bubbles: true }));

      // Track as filled
      const signature = fieldSignature(field);
      filledPairs.set(signature, 'FILE');

    } catch (e) {
      console.warn('Failed to fill file input:', e);
    }
  }
}

async function fillCustomWidget(selector, value) {
  if (!config.fillCustomWidgets) return false;

  // Look for custom widgets with specified attribute or role
  const widgets = Array.from(document.querySelectorAll(selector));
  if (widgets.length === 0) return false;

  for (const widget of widgets) {
    try {
      // For combobox/listbox, try to interact with options
      const options = widget.querySelectorAll('[role="option"], [role="combobox-option"], *[data-value]');
      if (options.length > 0 && value) {
        const matchingOption = Array.from(options).find(
          opt => opt.textContent?.trim().toLowerCase() === value.toLowerCase() ||
                 opt.getAttribute('data-value')?.toLowerCase() === value.toLowerCase()
        );
        if (matchingOption) {
          matchingOption.click();
          await sleep(50);
          return true;
        }
      }

      // Try triggering click
      widget.click();
      await sleep(50);
      return true;
    } catch (e) {
      console.warn('Custom widget fill failed:', e);
    }
  }

  return false;
}

function updateWatchMode() {
  if (watchObserver) {
    watchObserver.disconnect();
    watchObserver = null;
  }

  if (config.watchDynamic) {
    const observer = new MutationObserver((mutations) => {
      // Debounce fill operations
      if (dynamicFillTimeout) {
        clearTimeout(dynamicFillTimeout);
      }

      dynamicFillTimeout = setTimeout(() => {
        // Only trigger fill if extension is active in tab
        chrome.storage.local.get(['autofill-active-tab']).then(result => {
          if (result['autofill-active-tab'] === true) {
            // Check if form has been updated and fields changed
            const fields = gatherFields(document.body);
            console.log('Dynamic fields updated, found', fields.length);
            if (fields.length > 0) {
              // Auto-fill new fields with current options
              for (const field of fields) {
                if (shouldFillField(field, config, null)) {
                  const value = AutoFillData.generateValue(field, {
                    config.data,
                    rules: config.rules,
                    filledPairs: new Map()
                  });
                  if (value !== undefined && value !== null) {
                    applyValue(field, value);
                  }
                }
              }
            }
          }
        });
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    watchObserver = observer;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
async function init() {
  config = await AutoFillStorage.getConfig();
  const data = await AutoFillStorage.getData();
  config.data = data;
  config.rules = data.rules;

  // Parse rules and set options
  for (const rule of config.rules) {
    if (rule.type === 'field') {
      // Field matching rule
      continue;
    }
    if (rule.type === 'option') {
      if (rule.key && rule.value !== undefined) {
        config[rule.key] = rule.value;
      }
    }
  }

  // Update watch mode
  if (config.watchDynamic) {
    updateWatchMode();
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener(async (changes) => {
    if (changes[AutoFillStorage.KEY]) {
      config = changes[AutoFillStorage.KEY].newValue || await AutoFillStorage.getConfig();
      const data = await AutoFillStorage.getData();
      config.data = data;
      config.rules = data.rules;
      updateWatchMode();
    }
  });

  console.log('Auto Fill Test Helper content script initialized');
}

init().catch(console.error);