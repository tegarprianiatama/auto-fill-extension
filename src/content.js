const TEST_DATA = {
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  company: "Example QA Company",
  email: "test.user@example.test",
  phone: "555-0100",
  address: "123 Test Street",
  city: "Testville",
  state: "CA",
  postalCode: "90210",
  country: "United States",
  url: "https://example.test",
  username: "testuser",
  password: "TestPassword123!",
  text: "Synthetic test value"
};

const FIELD_SELECTORS = [
  "input:not([type='hidden'])",
  "textarea",
  "select"
].join(",");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AUTO_FILL_FORM") {
    return false;
  }

  const result = fillForm(message.options ?? {});
  sendResponse(result);
  return true;
});

function fillForm(options) {
  const fields = [...document.querySelectorAll(FIELD_SELECTORS)].filter((field) => shouldFillField(field, options));
  let filledCount = 0;

  for (const field of fields) {
    const value = valueForField(field);

    if (value === undefined) {
      continue;
    }

    if (applyValue(field, value)) {
      filledCount += 1;
    }
  }

  return { filledCount };
}

function shouldFillField(field, options) {
  if (!(field instanceof HTMLElement)) {
    return false;
  }

  if (field.disabled || field.readOnly || !isVisible(field)) {
    return false;
  }

  if (options.requiredOnly && !field.required && field.getAttribute("aria-required") !== "true") {
    return false;
  }

  if (options.mode !== "overwrite" && hasValue(field)) {
    return false;
  }

  return true;
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function hasValue(field) {
  if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) {
    return field.checked;
  }

  return "value" in field && field.value.trim() !== "";
}

function valueForField(field) {
  if (field instanceof HTMLSelectElement) {
    return firstSelectableOption(field);
  }

  if (field instanceof HTMLTextAreaElement) {
    return TEST_DATA.text;
  }

  if (!(field instanceof HTMLInputElement)) {
    return undefined;
  }

  if (["checkbox", "radio"].includes(field.type)) {
    return true;
  }

  if (field.type === "date") {
    return "2026-01-15";
  }

  if (field.type === "number") {
    return numberWithinRange(field);
  }

  if (field.type === "url") {
    return TEST_DATA.url;
  }

  if (field.type === "email") {
    return TEST_DATA.email;
  }

  if (field.type === "tel") {
    return TEST_DATA.phone;
  }

  if (field.type === "password") {
    return TEST_DATA.password;
  }

  return textValueForInput(field);
}

function textValueForInput(field) {
  const signature = fieldSignature(field);

  if (signature.includes("first") || signature.includes("given")) return TEST_DATA.firstName;
  if (signature.includes("last") || signature.includes("family") || signature.includes("surname")) return TEST_DATA.lastName;
  if (signature.includes("name")) return TEST_DATA.fullName;
  if (signature.includes("company") || signature.includes("organization")) return TEST_DATA.company;
  if (signature.includes("email")) return TEST_DATA.email;
  if (signature.includes("phone") || signature.includes("tel")) return TEST_DATA.phone;
  if (signature.includes("address") || signature.includes("street")) return TEST_DATA.address;
  if (signature.includes("city")) return TEST_DATA.city;
  if (signature.includes("state") || signature.includes("province")) return TEST_DATA.state;
  if (signature.includes("zip") || signature.includes("postal")) return TEST_DATA.postalCode;
  if (signature.includes("country")) return TEST_DATA.country;
  if (signature.includes("user")) return TEST_DATA.username;

  return TEST_DATA.text;
}

function fieldSignature(field) {
  const label = labelTextFor(field);
  return [
    field.type,
    field.name,
    field.id,
    field.placeholder,
    field.autocomplete,
    field.getAttribute("aria-label"),
    label
  ].filter(Boolean).join(" ").toLowerCase();
}

function labelTextFor(field) {
  if (field.id) {
    const explicitLabel = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    if (explicitLabel) return explicitLabel.textContent ?? "";
  }

  return field.closest("label")?.textContent ?? "";
}

function firstSelectableOption(select) {
  const option = [...select.options].find((candidate) => !candidate.disabled && candidate.value !== "");
  return option?.value;
}

function numberWithinRange(field) {
  const min = field.min === "" ? 1 : Number(field.min);
  const max = field.max === "" ? 42 : Number(field.max);

  if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
    return String(Math.floor((min + max) / 2));
  }

  return "42";
}

function applyValue(field, value) {
  if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) {
    field.checked = Boolean(value);
  } else if ("value" in field) {
    setNativeValue(field, value);
  } else {
    return false;
  }

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setNativeValue(field, value) {
  const prototype = Object.getPrototypeOf(field);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(field, value);
  } else {
    field.value = value;
  }
}
