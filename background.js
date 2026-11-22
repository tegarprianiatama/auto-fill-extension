// Background service worker
// Handles keyboard shortcuts, context menu, and badge updates

importScripts('src/storage.js', 'src/data.js');

let commandOptions = {};

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Auto Fill Test Helper installed');

  // Set up default commands hotkeys
  try {
    await chrome.commands.update({
      name: 'fill-form',
      suggestedKey: {
        default: 'Alt+Shift+F',
        windows: 'Alt+Shift+F',
        mac: 'Alt+Shift+F'
      }
    });
  } catch (e) {
    console.log('Could not update command:', e);
  }

  // Create context menu
  createContextMenu();

  // Initialize storage
  await AutoFillStorage.init();

  // Set badge text in active tabs
  updateBadge('Ready');
});

// Handle keyboard shortcuts (hotkeys)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-form') {
    await handleFillForm();
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'UPDATE_BADGE') {
    updateBadge(message.message, sender.tab?.id);
    return true;
  }

  if (message?.type === 'GET_CONFIG') {
    sendResponse(commandOptions);
    return true;
  }

  return false;
});

// Handle context menu clicks
chrome.runtime.onContextMenu.addListener((info) => {
  if (info.menuItemId === 'autofill-form') {
    handleFillFromContext(info);
  }
});

// Handle tab activation (update badge)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await refreshBadgeForTab(activeInfo.tabId);
});

// Handle tab updates (also refresh badge)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    await refreshBadgeForTab(tabId);
  }
});

// Side panel behavior
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: false
  });
}

// Main fill function triggered by command or context menu
async function handleFillForm() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      console.warn('No active tab');
      return;
    }

    // Set badge
    updateBadge('Filling...', tab.id);

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'AUTO_FILL_FORM',
      options: commandOptions
    });

    // Show result in badge
    if (response.error) {
      updateBadge('Error', tab.id, true);
      console.error('Auto-fill error:', response.error);
    } else {
      const { filledCount, skipped, configOverride } = response;
      const badgeText = `${filledCount}✓`;
      updateBadge(badgeText, tab.id);

      // Show info toast after brief delay
      setTimeout(() => {
        updateBadge('', tab.id);
      }, 3000);
    }
  } catch (error) {
    console.error('Fill command error:', error);
    updateBadge('Error', null, true);
  }
}

// Fill triggered from context menu
async function handleFillFromContext(info) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Scroll to top
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Set badge and fill
    updateBadge('Filling...', tab.id);

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'AUTO_FILL_FORM',
      options: commandOptions
    });

    if (response.error) {
      updateBadge('Error', tab.id, true);
    } else {
      const { filledCount } = response;
      updateBadge(`${filledCount}✓`, tab.id);
      setTimeout(() => updateBadge('', tab.id), 3000);
    }
  } catch (error) {
    console.error('Context menu fill error:', error);
    updateBadge('Error', null, true);
  }
}

// Create context menu
function createContextMenu() {
  chrome.contextMenus.create({
    id: 'autofill-form',
    title: 'Auto fill this form',
    contexts: ['page', 'editable', 'selection']
  });
}

// Update badge for a specific tab
async function updateBadge(text = '', tabId = null, isError = false) {
  if (typeof chrome.action.setBadgeText === 'function') {
    const targetTabId = tabId;
    try {
      await chrome.action.setBadgeText({
        text: text || '',
        tabId: targetTabId
      });

      if (text) {
        const color = isError ? '#d93025' : '#1a73e8';
        await chrome.action.setBadgeBackgroundColor({
          color: color,
          tabId: targetTabId
        });
      }
    } catch (e) {
      console.warn('Could not update badge:', e);
    }
  }
}

// Refresh badge for a tab
async function refreshBadgeForTab(tabId) {
  const config = await AutoFillStorage.getConfig();
  if (config.watchDynamic) {
    chrome.tabs.sendMessage(tabId, { type: 'UPDATE_BADGE', message: '' })
      .catch(() => {});
  }
}

// Listen for storage changes to update command options
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes[AutoFillStorage.KEY]) {
    config = changes[AutoFillStorage.KEY].newValue || await AutoFillStorage.getConfig();
    const data = AutoFillData.buildConfig(config.locale);
    commandOptions = {
      ...config,
      ...data
    };
  }
});

// Initialize command options
(async () => {
  const config = await AutoFillStorage.getConfig();
  const data = AutoFillData.buildConfig(config.locale);
  commandOptions = {
    ...config,
    ...data,
    rules: data.rules || []
  };
})();