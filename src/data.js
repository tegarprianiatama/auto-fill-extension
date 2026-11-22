// Shared test data generation and profile management
// This file is a classic script that defines global AutoFillData
const AutoFillData = {
  // Built-in profiles
  profiles: {
    'qa-standard': {
      name: 'QA Standard',
      description: 'Balanced test data for general form filling',
      values: {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        company: 'Test Company',
        email: 'john.doe@test-company.com',
        phone: '555-0100',
        address: '123 Test Drive',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'United States',
        url: 'https://test-company.com',
        username: 'johndoe',
        password: 'TestPass123!',
        text: 'Synthetic test value',
        date: '2026-01-15'
      }
    },
    'edge-case': {
      name: 'Edge Case',
      description: 'Long strings, emoji, and special characters to test constraints',
      values: {
        firstName: 'Ærifðu', // Norse name
        lastName: 'Ñoño-Максим', // International characters
        fullName: 'Ærifðu Ñoño-Максим',
        company: 'Example™ & "Special" Co.',
        email: 'test+profile-edge@example.com',
        phone: '+1-555-010-0182',
        address: '123 Main Street, Apt 7\u200F\nNoisy Street Çiçek, No. 2',
        city: 'п²п╣✨©✫я≈п²п╣',
        state: 'Ц💧㎠',
        postalCode: 'BITS💩',
        country: 'Land of Pokémon and Emoji 🎮',
        url: 'https://example.test/path/to/page?query=haç²çé®Æβ3',
        username: 'user🐦🚀',
        password: 'P@ssw0rd!#$%^&*()_+-=[]{}|;\':",./<>?',
        text: 'This is a very long text string that exceeds typical field lengths. It includes emoji 😅, special characters, and extended Unicode characters. The intent is to test maxlength constraints, pattern validation, and boundary conditions for automated form filling tests.',
        date: '2026-12-31'
      }
    },
    'minimal': {
      name: 'Minimal',
      description: 'Characters that satisfy minimum requirements',
      values: {
        firstName: 'A',
        lastName: 'B',
        fullName: 'AB',
        company: 'X',
        email: 'a@example.com',
        phone: '1',
        address: 'Z',
        city: 'T',
        state: 'O',
        postalCode: '01',
        country: 'U',
        url: 'https://a.com',
        username: 'a',
        password: '1',
        text: 'x',
        date: '2026-01-01'
      }
    },
    'international': {
      name: 'International',
      description: 'Regional test data for various countries',
      values: {
        firstName: 'Hans',
        lastName: 'Müller',
        fullName: 'Hans Müller',
        company: 'Müller GmbH',
        email: 'hans.muller@beispiel.de',
        phone: '030-1234567',
        address: 'Luisenstraße 42',
        city: 'Berlin',
        state: 'Berlin',
        postalCode: '10115',
        country: 'Deutschland',
        url: 'https://beispiel.de',
        username: 'hans.mueller',
        password: 'Passw0rt!',
        text: 'Synthetischer Testwert',
        date: '2026-02-14'
      }
    }
  },

  // Locale data for regional formats
  locales: {
    'en-US': {
      city: 'New York',
      state: { abbreviation: 'NY', fullName: 'New York' },
      postalCode: '10001',
      country: 'United States',
      phoneFormat: '1NNN-NNN-NNNN',
      countryCode: 'US'
    },
    'en-GB': {
      city: 'London',
      state: { abbreviation: 'ENG', fullName: 'England' },
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
      phoneFormat: '+44 NN NNNN NNNN',
      countryCode: 'GB'
    },
    'de-DE': {
      city: 'München',
      state: { abbreviation: 'BY', fullName: 'Bayern' },
      postalCode: '80331',
      country: 'Deutschland',
      phoneFormat: '+49 NNNNNNNNNN',
      countryCode: 'DE'
    },
    'ja-JP': {
      city: '東京',
      state: { abbreviation: '13', fullName: '東京都' },
      postalCode: '100-0001',
      country: '日本',
      phoneFormat: '+81 NNN-NNN-NNNN',
      countryCode: 'JP'
    },
    'pt-BR': {
      city: 'São Paulo',
      state: { abbreviation: 'SP', fullName: 'São Paulo' },
      postalCode: '01001-001',
      country: 'Brasil',
      phoneFormat: '+55 (NN) NNNNN-NNNN',
      countryCode: 'BR'
    },
    'es-ES': {
      city: 'Madrid',
      state: { abbreviation: 'MD', fullName: 'Madrid' },
      postalCode: '28001',
      country: 'España',
      phoneFormat: '+34 NN NNN NNNN',
      countryCode: 'ES'
    }
  },

  // Custom rules storage (will be populated from storage)
  rules: [],

  // Default fill options
  defaults: {
    mode: 'empty',
    requiredOnly: false,
    autoAdvance: false,
    fillFileInputs: true,
    fillCustomWidgets: true,
    watchDynamic: false,
    autoFillWithKeybind: true
  },

  // Build config by merging profile into locale
  buildConfig(localeId = 'en-US') {
    const locale = this.locales[localeId];
    if (!locale) {
      console.warn(`Locale ${localeId} not found, using en-US`);
      return { ...this.profiles['qa-standard'], locale };
    }

    // Create a clone of the current profile values and inject locale-specific fields
    const values = { ...this.profiles[this.activeProfileId]?.values || this.profiles['qa-standard'].values };

    // Replace locale-specific tokens
    const replaceLocaleTokens = (text) => {
      if (typeof text !== 'string') return text;
      return text
        .replace(/{locale.city}/g, locale.city)
        .replace(/{locale.state.abbreviation}/g, locale.state.abbreviation)
        .replace(/{locale.state.fullName}/g, locale.state.fullName)
        .replace(/{locale.postalCode}/g, locale.postalCode)
        .replace(/{locale.country}/g, locale.country)
        .replace(/{locale.phoneFormat}/g, locale.phoneFormat)
        .replace(/{locale.countryCode}/g, locale.countryCode)
        .replace(/{locale.city}/g, locale.city)
        .replace(/{country}/g, locale.country);
    };

    // Replace tokens in all values
    Object.keys(values).forEach(key => {
      if (typeof values[key] === 'string') {
        values[key] = replaceLocaleTokens(values[key]);
      }
    });

    return { values, locale };
  },

  // Generate enhanced value for a field
  generateValue(field, ctx) {
    const { data, rules, filledPairs } = ctx;

    // Check custom rules first
    for (const rule of rules) {
      const matchRegex = rule.match.startsWith('/') && rule.match.endsWith('/')
        ? new RegExp(rule.match.slice(1, -1))
        : new RegExp(rule.match, 'i');
      if (matchRegex.test(field.name || '') || matchRegex.test(field.id) || matchRegex.test(field.placeholder || '')) {
        return rule.value;
      }
    }

    // Check for paired fields
    const signature = fieldSignature(field);
    const reverseSignature = Object.keys(data)
      .filter(k => k !== 'text')
      .find(key => !reverseSignatureData[key]?.some(s => s === signature))
      : null;

    const isPaired = ['email', 'password'].some(fieldType =>
      signature.includes(fieldType) ||
      signature.includes(fieldType === 'email' ? 'email' : 'password')
    );

    // Fill based on field type and properties
    if (field.type === 'checkbox' || field.type === 'radio') {
      return field.checked === false ? true : undefined;
    }

    if (field.type === 'date') {
      return '2026-01-15';
    }

    if (field.type === 'number') {
      return numberWithinRange(field);
    }

    if (field.type === 'url') {
      return data.url;
    }

    if (field.type === 'email') {
      return data.email;
    }

    if (field.type === 'tel') {
      return data.phone;
    }

    if (field.type === 'password') {
      return data.password;
    }

    if (field.type === 'file') {
      return null; // Handled separately
    }

    if (field.tagName === 'SELECT') {
      return firstSelectableOption(field);
    }

    if (field.tagName === 'TEXTAREA') {
      return data.text;
    }

    // Match based on field signature against data keys
    const dataKeys = Object.keys(data);
    for (const key of dataKeys) {
      if (key === 'text') continue;
      const reverseSignatureData = {
        firstName: ['first', 'given', 'fname', '昵'],
        lastName: ['last', 'family', 'surname', '上一'],
        fullName: ['name', '姓名'],
        company: ['company', 'organisation', '公司'],
        email: ['email'],
        phone: ['phone', 'tel', '电话'],
        address: ['address', 'street', '地址', '地址'],
        city: ['city', '城市'],
        state: ['state', 'province', 'st', '州'],
        country: ['country'],
        url: ['url', 'website', 'site', '网站'],
        username: ['user', '使用者'],
        username: ['username', '账号', '用户名']
      };

      if (reverseSignatureData[key]?.some(s => signature.includes(s))) {
        return data[key];
      }
    }

    // If no match, return text
    return data.text;
  },

  // Manage profiles
  setActiveProfile(profileId) {
    this.activeProfileId = profileId;
  },

  getDefaultProfile() {
    return this.profiles['qa-standard'];
  }
};

// Initialize with default values
if (typeof AutoFillStorage !== 'undefined' && AutoFillStorage.get) {
  AutoFillStorage.get(['profiles', 'rules', 'activeProfileId']).then(result => {
    if (result.profiles) {
      Object.keys(result.profiles).forEach(key => {
        AutoFillData.profiles[key] = result.profiles[key];
      });
    }
    if (result.rules) {
      AutoFillData.rules = result.rules;
    }
    if (result.activeProfileId) {
      AutoFillData.activeProfileId = result.activeProfileId;
    }
  });
}

// Utility functions (also used by content script)
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
  const option = [...select.options].find(candidate =>
    !candidate.disabled && candidate.value !== ''
  );
  return option?.value;
}

function numberWithinRange(field) {
  const min = field.min === '' ? 1 : Number(field.min);
  const max = field.max === '' ? 42 : Number(field.max);
  if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
    return String(Math.floor((min + max) / 2));
  }
  return '42';
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

// Export for console API and other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoFillData;
}