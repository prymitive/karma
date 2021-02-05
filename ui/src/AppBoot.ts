// helpers used to bootstrap App instance and environment for it

import { init } from "@sentry/browser";

import { UIDefaults } from "Models/UI";

const SettingsElement = (): HTMLElement | null =>
  document.getElementById("settings");

const SetupSentry = (settingsElement: HTMLElement | null): void => {
  if (
    settingsElement !== null &&
    settingsElement.dataset.sentryDsn &&
    settingsElement.dataset.sentryDsn !== "{{ .SentryDSN }}"
  ) {
    let version = "unknown";
    if (
      settingsElement.dataset.version &&
      settingsElement.dataset.version !== "{{ .Version }}"
    ) {
      version = settingsElement.dataset.version;
    }

    try {
      init({
        dsn: settingsElement.dataset.sentryDsn,
        release: version,
        autoSessionTracking: false,
      });
    } catch (err) {
      console.error("Sentry config failed: " + err);
    }
  }
};

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
  defaultsElement: HTMLElement | null
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

export { SettingsElement, SetupSentry, ParseDefaultFilters, ParseUIDefaults };
