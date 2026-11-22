// Inject into MAIN world to expose console API
// This runs in the same JavaScript execution context as the page, allowing access to window

// Helper to locate content script in same page
function findContentScript() {
  // Look for window.__AUTO_FILL_MESSAGE__
  return {
    send: (message) => {
      // Try multiple strategies to find content script
      try {
        // Strategy 1: Check if content script is injected directly on window
        if (window.__AUTO_FILL_MESSAGE__) {
          window.__AUTO_FILL_MESSAGE__(message);
          return true;
        }

        // Strategy 2: Look for Chrome extension message listener
        for (const key in window) {
          if (key.includes('chrome') || key.includes('runtime') || key.includes('tabs')) {
            const obj = window[key];
            if (obj && typeof obj.sendMessage === 'function') {
              chrome.runtime.sendMessage(message);
              return true;
            }
          }
        }

        console.warn('Could not locate content script. Ensure the extension is loaded.');
        return false;
      } catch (e) {
        console.error('Error sending auto-fill message:', e);
        return false;
      }
    }
  };
}

// Create message ID for responses
let messageCounter = 0;
const pendingMessages = new Map();

// Define autoFillTest API
window.autoFillTest = (options = {}) => {
  return new Promise((resolve, reject) => {
    const messageId = ++messageCounter;
    const timeout = setTimeout(() => {
      pendingMessages.delete(messageId);
      reject(new Error('Auto-fill response timeout'));
    }, 10000); // 10 second timeout

    pendingMessages.set(messageId, { resolve, reject, timeout });
  });
};

// Handle messages from content scripts
window.__AUTO_FILL_MESSAGE__ = (message) => {
  if (message?.source === 'autofill-helper-response') {
    const { id, result, error } = message;
    if (result) {
      appendConsoleResult(result);
    }
    if (error) {
      console.error('Auto-fill error:', error);
    }

    const handler = pendingMessages.get(id);
    if (handler) {
      clearTimeout(handler.timeout);
      pendingMessages.delete(id);
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(result);
      }
    }
  }
};

// Multiple message backup methods (in case __AUTO_FILL_MESSAGE__ isn't captured)
window.addEventListener('message', (event) => {
  if (event.data?.source === 'autofill-helper-response') {
    const { id, result, error } = event.data;
    const handler = pendingMessages.get(id);
    if (handler) {
      clearTimeout(handler.timeout);
      pendingMessages.delete(id);
      if (error) {
        handler.reject(new Error(error));
        console.error('Auto-fill error:', error);
      } else {
        appendConsoleResult(result);
        handler.resolve(result);
      }
    }
  }
}, true);

// Expose internal API for debugging
window.__AUTOFILL_DEBUG__ = {
  execute: async (options = {}) => {
    const contentScript = findContentScript();
    if (!contentScript) {
      return { error: 'Content script not found' };
    }

    contentScript.send({
      type: 'AUTO_FILL_FORM',
      options
    });
  },

  getFields: () => {
    try {
      // Simple field gathering for the page
      const HIDDEN_INPUT = 'input:not([type="hidden"]),textarea,select';
      const elements = document.querySelectorAll(HIDDEN_INPUT);
      return Array.from(elements).map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || '',
        id: el.id || '',
        value: el.value ? '[value set]' : ''
      }));
    } catch (e) {
      return { error: e.message };
    }
  },

  getConfig: () => {
    return window.autoFillTestConfig;
  },

  setWatch: (watch) => {
    if (!window.__AUTO_FILL_MESSAGE__) return false;
    window.__AUTO_FILL_MESSAGE__({
      type: 'SET_WATCH',
      watch: Boolean(watch)
    });
    return true;
  },

  setOptions: (options) => {
    if (!window.__AUTO_FILL_MESSAGE__) return false;
    window.__AUTO_FILL_MESSAGE__({
      type: 'SET_OPTIONS',
      options: options
    });
    return true;
  }
};

console.log(
  '%c🧪 Auto Fill Test Helper',
  'font-size: 16px; font-weight: bold; color: #1a73e8;',
  '\nClick button: window.autoFillTest()',
  '\nFind fields: window.__AUTOFILL_DEBUG__.getFields()',
  '\nGet config: window.__AUTOFILL_DEBUG__.getConfig()'
);

console.warn('⚠️ Auto Fill Test Helper is loaded. You may need to refresh the page for console API to work. See: https://developer.chrome.com/docs/extensions/mv3/content_scripts/#main_world');