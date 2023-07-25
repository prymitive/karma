// helpers used to bootstrap App instance and environment for it

import type { UIDefaults } from "Models/UI";

const SettingsElement = (): HTMLElement | null =>
  document.getElementById("settings");

const ParseDefaultFilters = (settingsElement: HTMLElement | null): string[] => {
  let defaultFilters = [];
  if (
    settingsElement !== null &&
    settingsElement.dataset.defaultFiltersBase64 &&
    settingsElement.dataset.defaultFiltersBase64 !== "{{ .DefaultFilter }}"
  ) {
    // decode from base64 to a string
    const decoded = window.atob(settingsElement.dataset.defaultFiltersBase64);
    // parse decoded string as JSON
    const json = JSON.parse(decoded);
    // if we got an array then use it as default filters
    if (Array.isArray(json)) {
      defaultFilters = json;
    }
  }
  return defaultFilters;
};

const ParseUIDefaults = (
  defaultsElement: HTMLElement | null,
): UIDefaults | null => {
  if (defaultsElement === null) {
    return null;
  }
  try {
    const decoded = window.atob(defaultsElement.innerHTML);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export { SettingsElement, ParseDefaultFilters, ParseUIDefaults };
