// Options page logic for Auto Fill Test Helper
importScripts('../src/storage.js', '../src/data.js');

// DOM elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const statusElement = document.getElementById('status');

// Profile management elements
const profileList = document.getElementById('profileList');
const createProfileBtn = document.getElementById('createProfile');
const editCurrentProfileBtn = document.getElementById('editCurrentProfile');
const deleteProfileBtn = document.getElementById('deleteProfile');

// Rule management elements
const ruleForm = {
  match: document.getElementById('ruleMatch'),
  value: document.getElementById('ruleValue'),
  addBtn: document.getElementById('addRule')
};
const ruleList = document.getElementById('ruleList');

// Settings elements
const settingsForm = {
  mode: document.querySelector('input[name="mode"]'),
  requiredOnly: document.getElementById('requiredOnly'),
  autoAdvance: document.getElementById('autoAdvance'),
  fillFileInputs: document.getElementById('fillFileInputs'),
  fillCustomWidgets: document.getElementById('fillCustomWidgets'),
  watchDynamic: document.getElementById('watchDynamic'),
  locale: document.getElementById('locale')
};

const saveAllBtn = document.getElementById('saveAll');
const resetDefaultsBtn = document.getElementById('resetDefaults');

// Track selected profile
let selectedProfileId = null;
let editingProfile = null;

// Initialize
(async function init() {
  await loadCurrentProfile();
  renderProfileList();
  loadSettings();
  renderRulesList();
  setupEventListeners();
})();

async function loadCurrentProfile() {
  try {
    const config = await AutoFillStorage.getConfig();
    selectedProfileId = config.activeProfileId;
  } catch (e) {
    console.error('Failed to load profile:', e);
  }
}

async function loadSettings() {
  try {
    const config = await AutoFillStorage.getConfig();
    if (config.mode) settingsForm.mode.value = config.mode;
    if (config.requiredOnly !== undefined) settingsForm.requiredOnly.checked = config.requiredOnly;
    if (config.autoAdvance !== undefined) settingsForm.autoAdvance.checked = config.autoAdvance;
    if (config.fillFileInputs !== undefined) settingsForm.fillFileInputs.checked = config.fillFileInputs;
    if (config.fillCustomWidgets !== undefined) settingsForm.fillCustomWidgets.checked = config.fillCustomWidgets;
    if (config.watchDynamic !== undefined) settingsForm.watchDynamic.checked = config.watchDynamic;
    if (config.locale) settingsForm.locale.value = config.locale;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function setupEventListeners() {
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab));
  });

  // Save all
  saveAllBtn.addEventListener('click', saveAllSettings);
  resetDefaultsBtn.addEventListener('click', resetToDefaults);

  // Settings changes
  Object.values(settingsForm).forEach(el => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.addEventListener('change', () => {
        // Auto-save as we change settings
        saveCurrentTabData();
      });
    }
  });

  // Profile management
  createProfileBtn.addEventListener('click', createNewProfile);
  editCurrentProfileBtn.addEventListener('click', editSelectedProfile);
  deleteProfileBtn.addEventListener('click', deleteSelectedProfile);

  // Rules
  ruleForm.addBtn.addEventListener('click', addRule);
}

function switchTab(tabElement) {
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(c => c.classList.remove('active'));

  tabElement.classList.add('active');
  const tabName = tabElement.dataset.tab;
  document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');

  // Save data before switching
  saveCurrentTabData();
  // Load data when switching
  switch(tabName) {
    case 'profiles': renderProfileList(); break;
    case 'rules': renderRulesList(); break;
    case 'settings': loadSettings(); break;
  }
}

async function saveCurrentTabData() {
  switch(document.querySelector('.tab.active').dataset.tab) {
    case 'settings': return await saveSettings();
    case 'rules': return await saveRules();
    case 'profiles': return await saveProfiles();
  }
}

// Settings management
async function saveSettings() {
  try {
    const config = await AutoFillStorage.getConfig();
    config.mode = settingsForm.mode.value;
    config.requiredOnly = settingsForm.requiredOnly.checked;
    config.autoAdvance = settingsForm.autoAdvance.checked;
    config.fillFileInputs = settingsForm.fillFileInputs.checked;
    config.fillCustomWidgets = settingsForm.fillCustomWidgets.checked;
    config.watchDynamic = settingsForm.watchDynamic.checked;
    config.locale = settingsForm.locale.value;
    config.activeProfileId = selectedProfileId;
    await AutoFillStorage.set(config);
    showStatus('Settings saved successfully!', 'success');
    return true;
  } catch (e) {
    showStatus('Failed to save settings: ' + e.message, 'error');
    return false;
  }
}

// Rules management
async function renderRulesList() {
  try {
    const config = await AutoFillStorage.getConfig();
    const rules = config.rules || [];
    ruleList.innerHTML = '';

    if (rules.length === 0) {
      ruleList.innerHTML = '<p style="color: #5f6368; font-style: italic;">No custom rules yet.</p>';
      return;
    }

    rules.forEach((rule, index) => {
      const div = document.createElement('div');
      div.className = 'rule-item';
      div.dataset.index = index;
      div.innerHTML = `
        <div class="rule-match">${escapeHtml(rule.match)}</div>
        <div class="rule-value">"${escapeHtml(rule.value)}"</div>
        <button class="btn-delete-rule" data-index="${index}">Delete</button>
      `;
      ruleList.appendChild(div);
    });

    // Add event listeners to delete buttons
    ruleList.querySelectorAll('.btn-delete-rule').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        try {
          const config = await AutoFillStorage.getConfig();
          config.rules.splice(index, 1);
          await AutoFillStorage.set(config);
          renderRulesList();
          showStatus('Rule deleted.', 'success');
        } catch (e) {
          showStatus('Failed to delete rule: ' + e.message, 'error');
        }
      });
    });
  } catch (e) {
    showStatus('Failed to load rules: ' + e.message, 'error');
  }
}

async function addRule() {
  const match = ruleForm.match.value.trim();
  const value = ruleForm.value.value.trim();

  if (!match || !value) {
    showStatus('Please provide both match and value.', 'error');
    return;
  }

  try {
    const rule = await AutoFillStorage.addRule({
      match: match,
      value: value
    });

    ruleForm.match.value = '';
    ruleForm.value.value = '';
    renderRulesList();
    showStatus('Rule added successfully!', 'success');
  } catch (e) {
    showStatus('Failed to add rule: ' + e.message, 'error');
  }
}

// Profile management
async function renderProfileList() {
  try {
    const config = await AutoFillStorage.getConfig();
    const profiles = config.profiles || {};
    profileList.innerHTML = '';

    Object.keys(profiles).forEach(profileId => {
      const profile = profiles[profileId];
      const isSelected = profileId === selectedProfileId;

      const card = document.createElement('div');
      card.className = 'profile-card' + (isSelected ? ' selected' : '');
      card.dataset.profileId = profileId;

      card.innerHTML = `
        <div class="profile-details">
          <div class="profile-header">
            <strong>${escapeHtml(profile.name)}</strong>
            ${isSelected ? '<span class="profile-badge">Active</span>' : ''}
          </div>
          <div class="profile-description">${escapeHtml(profile.description || '')}</div>
        </div>
        <div class="profile-actions">
          <button class="btn-select-profile" data-profile-id="${profileId}">Select</button>
        </div>
      `;

      profileList.appendChild(card);
    });

    // Add event listeners
    profileList.querySelectorAll('.btn-select-profile').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const profileId = e.target.dataset.profileId;
        selectedProfileId = profileId;
        renderProfileList();
        showStatus(`Profile "${profiles[profileId].name}" selected.`, 'success');
      });
    });
  } catch (e) {
    showStatus('Failed to load profiles: ' + e.message, 'error');
  }
}

async function createNewProfile() {
  const name = prompt('Profile name:');
  if (!name) return;

  const description = prompt('Profile description (optional):') || '';

  try {
    const config = await AutoFillStorage.getConfig();
    const newId = 'custom-' + Date.now();
    config.profiles[newId] = {
      name: name,
      description: description,
      values: { ...config.profiles[selectedProfileId]?.values || AutoFillData.profiles['qa-standard'].values }
    };
    await AutoFillStorage.set(config);
    selectedProfileId = newId;
    renderProfileList();
    showStatus(`Profile "${name}" created successfully!`, 'success');
  } catch (e) {
    showStatus('Failed to create profile: ' + e.message, 'error');
  }
}

async function editSelectedProfile() {
  try {
    const config = await AutoFillStorage.getConfig();
    const profile = config.profiles[selectedProfileId];
    if (!profile) return;

    editingProfile = { ...profile };

    // Get all values from profile
    const values = Object.keys(profile.values).join('\n');
    const edits = prompt(
      'Edit profile values. One per line in format: key=value',
      values
    );

    if (!edits) return;

    const newValues = {};
    edits.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value !== undefined) {
        newValues[key.trim()] = value.trim();
      }
    });

    // Update profile
    profile.values = { ...profile.values, ...newValues };
    await AutoFillStorage.set(config);

    editingProfile = null;
    renderProfileList();
    showStatus('Profile updated successfully!', 'success');
  } catch (e) {
    showStatus('Failed to edit profile: ' + e.message, 'error');
  }
}

async function deleteSelectedProfile() {
  const profiles = AutoFillData.profiles;
  const profileIds = Object.keys(profiles);

  if (profileIds.length <= 1) {
    showStatus('Cannot delete built-in profiles. Select a custom profile to delete it.', 'error');
    return;
  }

  const profile = profiles[selectedProfileId];
  if (!profile) return;

  const confirmDelete = confirm(
    `Delete profile "${profile.name}"?\n\nThis will remove all custom data for this profile.`
  );

  if (!confirmDelete) return;

  try {
    const config = await AutoFillStorage.getConfig();
    delete config.profiles[selectedProfileId];
    selectedProfileId = 'qa-standard';
    await AutoFillStorage.set(config);
    renderProfileList();
    showStatus('Profile deleted successfully!', 'success');
  } catch (e) {
    showStatus('Failed to delete profile: ' + e.message, 'error');
  }
}

// Save all tabs
async function saveAllSettings() {
  const tab = document.querySelector('.tab.active').dataset.tab;
  let success = true;

  try {
    if (tab === 'settings') {
      success &&= await saveSettings();
      if (success) {
        await deleteUnusedProfiles();
      }
    } else if (tab === 'rules') {
      success &&= await saveRules();
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }

  if (success) {
    showStatus('All settings saved!', 'success');
  }
}

async function saveRules() {
  try {
    const config = await AutoFillStorage.getConfig();
    config.rules = config.rules || [];
    await AutoFillStorage.set(config);
    return true;
  } catch (e) {
    showStatus('Failed to save rules: ' + e.message, 'error');
    return false;
  }
}

async function deleteUnusedProfiles() {
  try {
    const config = await AutoFillStorage.getConfig();
    const builtInProfiles = Object.keys(AutoFillData.profiles);
    const customProfiles = Object.keys(config.profiles);

    // Remove custom profiles that no longer exist in built-in
    for (const profileId of [...customProfiles]) {
      if (!builtInProfiles.includes(profileId)) {
        delete config.profiles[profileId];
      }
    }

    // Ensure active profile is valid
    if (!config.profiles[selectedProfileId]) {
      selectedProfileId = 'qa-standard';
      config.activeProfileId = 'qa-standard';
    }

    await AutoFillStorage.set(config);
  } catch (e) {
    console.warn('Could not clean up profiles:', e);
  }
}

async function resetToDefaults() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;

  try {
    await AutoFillStorage.clear();
    await AutoFillStorage.init();

    selectedProfileId = 'qa-standard';
    editingProfile = null;

    loadSettings();
    renderProfileList();
    renderRulesList();

    showStatus('Settings reset to defaults!', 'success');
  } catch (e) {
    showStatus('Failed to reset: ' + e.message, 'error');
  }
}

function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = 'status-message ' + type;

  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = 'status-message';
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}