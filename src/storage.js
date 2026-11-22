// Storage management for extension configuration
const AutoFillStorage = {
  KEY: 'autofill_test_helper',

  async get(keys) {
    const data = await chrome.storage.sync.get(this.KEY);
    return data[this.KEY] || {};
  },

  async set(data) {
    await chrome.storage.sync.set({ [this.KEY]: data });
  },

  async clear() {
    await chrome.storage.sync.remove(this.KEY);
  },

  // Initialize default storage
  async init() {
    const existing = await this.get();
    if (Object.keys(existing).length === 0) {
      const defaults = {
        version: 1,
        activeProfileId: 'qa-standard',
        locale: 'en-US',
        mode: 'empty',
        requiredOnly: false,
        autoAdvance: false,
        fillFileInputs: true,
        fillCustomWidgets: true,
        watchDynamic: false,
        autoFillWithKeybind: true,
        profiles: {},
        rules: []
      };

      // Save built-in profiles
      for (const [id, profile] of Object.entries(AutoFillData.profiles)) {
        defaults.profiles[id] = { ...profile };
      }

      await this.set(defaults);
    }
    return this.get();
  },

  // Get current config
  async getConfig() {
    const existing = await this.get();
    return {
      ...AutoFillData.defaults,
      ...existing,
      profiles: { ...AutoFillData.profiles, ...existing.profiles },
      rules: existing.rules || []
    };
  },

  // Get current active data
  async getData() {
    const config = await this.getConfig();
    return AutoFillData.buildConfig(config.locale);
  },

  // Set language
  async setLocale(localeId) {
    const config = await this.getConfig();
    config.locale = localeId;
    await this.set(config);
  },

  // Set active profile
  async setActiveProfile(profileId) {
    const config = await this.getConfig();
    config.activeProfileId = profileId;
    await this.set(config);
  },

  // Add custom rule
  async addRule(rule) {
    const config = await this.getConfig();
    rule.id = Date.now().toString();
    rule.createdAt = Date.now();
    config.rules = [...config.rules, rule];
    await this.set(config);
    return rule;
  },

  // Delete rule
  async deleteRule(ruleId) {
    const config = await this.getConfig();
    config.rules = config.rules.filter(r => r.id !== ruleId);
    await this.set(config);
  },

  // Save profile
  async saveProfile(profileId, profileData) {
    const config = await this.getConfig();
    config.profiles[profileId] = profileData;
    await this.set(config);
  },

  // Delete profile
  async deleteProfile(profileId) {
    const config = await this.getConfig();
    delete config.profiles[profileId];
    await this.set(config);
  },

  // Persist options
  async setOptions(options) {
    const config = await this.getConfig();
    Object.assign(config, options);
    await this.set(config);
  },

  // Export configuration as JSON
  async exportConfig() {
    const config = await this.getConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    return url;
  },

  // Import configuration from JSON
  async importConfig(jsonData) {
    try {
      const config = JSON.parse(jsonData);
      config.version = 1;
      await this.set(config);
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }
};

// Initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.storage) {
  AutoFillStorage.init();
}