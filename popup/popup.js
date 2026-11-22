const fillButton = document.querySelector("#fillForm");
const requiredOnlyInput = document.querySelector("#requiredOnly");
const autoAdvanceInput = document.querySelector("#autoAdvance");
const fillFileInputsInput = document.querySelector("#fillFileInputs");
const fillCustomWidgetsInput = document.querySelector("#fillCustomWidgets");
const watchDynamicInput = document.querySelector("#watchDynamic");
const localeSelect = document.querySelector("#locale");
const statusOutput = document.querySelector("#status");

// Options panel elements
const optionsToggle = document.querySelector("#optionsToggle");
const optionsPanel = document.querySelector("#optionsPanel");
const optionsClose = document.querySelector("#optionsClose");
const customDataInput = document.querySelector("#customDataInput");
const customFieldName = document.querySelector("#customFieldName");
const customFieldValue = document.querySelector("#customFieldValue");
const addCustomRuleBtn = document.querySelector("#addCustomRule");
const customRulesList = document.querySelector("#customRulesList");
const exportConfigBtn = document.querySelector("#exportConfig");
const importConfigInput = document.querySelector("#importConfig");
const importConfigBtn = document.querySelector("#importConfigBtn");
const resetConfigBtn = document.querySelector("#resetConfig");

// Load saved config on popup open
(async function loadConfig() {
  try {
    const config = await AutoFillStorage.getConfig();
    if (config.mode) {
      const modeRadio = document.querySelector(`input[name="mode"][value="${config.mode}"]`);
      if (modeRadio) modeRadio.checked = true;
    }
    if (config.requiredOnly !== undefined) requiredOnlyInput.checked = config.requiredOnly;
    if (config.autoAdvance !== undefined) autoAdvanceInput.checked = config.autoAdvance;
    if (config.fillFileInputs !== undefined) fillFileInputsInput.checked = config.fillFileInputs;
    if (config.fillCustomWidgets !== undefined) fillCustomWidgetsInput.checked = config.fillCustomWidgets;
    if (config.watchDynamic !== undefined) watchDynamicInput.checked = config.watchDynamic;
    if (config.locale) localeSelect.value = config.locale;
    if (config.activeProfileId) {
      const profileRadio = document.querySelector(`input[name="profilePresets"][value="${config.activeProfileId}"]`);
      if (profileRadio) profileRadio.checked = true;
    }
  } catch (e) {
    console.warn('Failed to load config:', e);
  }
})();

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value ?? "empty";
}

function selectedProfile() {
  return document.querySelector('input[name="profilePresets"]:checked')?.value ?? "qa-standard";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(message) {
  statusOutput.textContent = message;
}

fillButton.addEventListener("click", async () => {
  fillButton.disabled = true;
  setStatus("Filling form…");

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    // Build options from UI state
    const options = {
      mode: selectedMode(),
      requiredOnly: requiredOnlyInput.checked,
      autoAdvance: autoAdvanceInput.checked,
      fillFileInputs: fillFileInputsInput.checked,
      fillCustomWidgets: fillCustomWidgetsInput.checked,
      watchDynamic: watchDynamicInput.checked,
      locale: localeSelect.value,
      activeProfileId: selectedProfile()
    };

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'AUTO_FILL_FORM',
      options: options
    });

    // Update badge in background
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      message: `${response.filledCount || 0}✓`
    }).catch(() => {});

    setStatus(`Filled ${response.filledCount || 0} field${(response.filledCount || 0) === 1 ? '' : 's'}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to fill this page.");
  } finally {
    fillButton.disabled = false;
  }
});

// Options panel toggle
if (optionsToggle && optionsPanel && optionsClose) {
  optionsToggle.addEventListener('click', () => {
    optionsPanel.classList.remove('hidden');
    optionsPanel.style.display = 'block';
  });

  optionsClose.addEventListener('click', () => {
    optionsPanel.classList.add('hidden');
    optionsPanel.style.display = 'none';
  });
}

// Save options when changed
document.querySelectorAll('input[type="checkbox"], input[type="radio"], select').forEach(el => {
  el.addEventListener('change', async () => {
    try {
      const config = await AutoFillStorage.getConfig();
      config.mode = selectedMode();
      config.requiredOnly = requiredOnlyInput.checked;
      config.autoAdvance = autoAdvanceInput.checked;
      config.fillFileInputs = fillFileInputsInput.checked;
      config.fillCustomWidgets = fillCustomWidgetsInput.checked;
      config.watchDynamic = watchDynamicInput.checked;
      config.locale = localeSelect.value;
      config.activeProfileId = selectedProfile();
      await AutoFillStorage.set(config);
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  });
});

// Custom rules management
if (addCustomRuleBtn && customFieldName && customFieldValue) {
  addCustomRuleBtn.addEventListener('click', async () => {
    const fieldName = customFieldName.value.trim();
    const fieldValue = customFieldValue.value.trim();

    if (!fieldName || !fieldValue) {
      alert('Please enter both a field name and value.');
      return;
    }

    try {
      const rule = await AutoFillStorage.addRule({
        match: fieldName,
        value: fieldValue,
        type: 'field'
      });

      customFieldName.value = '';
      customFieldValue.value = '';
      refreshCustomRulesList();
    } catch (e) {
      console.error('Failed to add rule:', e);
    }
  });
}

// Refresh custom rules list
async function refreshCustomRulesList() {
  try {
    const config = await AutoFillStorage.getConfig();
    const rules = config.rules || [];
    customRulesList.innerHTML = '';

    if (rules.length === 0) {
      customRulesList.innerHTML = '<li style="color: #666;">No custom rules added yet.</li>';
      return;
    }

    rules.forEach(rule => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${rule.match}</strong>: "${rule.value}"
        <button class="delete-rule-btn" data-id="${rule.id}" style="margin-left: 0.5rem; color: #d93025; background: none; border: none; cursor: pointer;">✕</button>
      `;
      customRulesList.appendChild(li);
    });

    // Add delete handlers
    customRulesList.querySelectorAll('.delete-rule-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ruleId = btn.getAttribute('data-id');
        try {
          await AutoFillStorage.deleteRule(ruleId);
          refreshCustomRulesList();
        } catch (e) {
          console.error('Failed to delete rule:', e);
        }
      });
    });
  } catch (e) {
    console.warn('Failed to refresh rules list:', e);
  }
}

// Export configuration
if (exportConfigBtn) {
  exportConfigBtn.addEventListener('click', async () => {
    try {
      const url = await AutoFillStorage.exportConfig();
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'autofill-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Configuration exported!');
    } catch (e) {
      console.error('Export failed:', e);
      setStatus('Export failed.');
    }
  });
}

// Import configuration
if (importConfigBtn && importConfigInput) {
  importConfigBtn.addEventListener('click', () => {
    importConfigInput.click();
  });

  importConfigInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await AutoFillStorage.importConfig(text);
      if (success) {
        setStatus('Configuration imported successfully!');
        refreshCustomRulesList();
      } else {
        setStatus('Import failed. Invalid JSON.');
      }
    } catch (e) {
      console.error('Import failed:', e);
      setStatus('Import failed.');
    }

    // Reset file input
    importConfigInput.value = '';
  });
}

// Reset configuration
if (resetConfigBtn) {
  resetConfigBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      try {
        await AutoFillStorage.clear();
        await AutoFillStorage.init();
        setStatus('Settings reset to defaults.');
        refreshCustomRulesList();
      } catch (e) {
        console.error('Reset failed:', e);
        setStatus('Reset failed.');
      }
    }
  });
}

// Initialize custom rules list on load
refreshCustomRulesList().catch(console.error);