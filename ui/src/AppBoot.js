// helpers used to bootstrap App instance and environment for it

import * as Sentry from "@sentry/browser";

const SettingsElement = () => document.getElementById("settings");

const SetupSentry = settingsElement => {
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
      Sentry.init({
        dsn: settingsElement.dataset.sentryDsn,
        release: version
      });
    } catch (err) {
      console.error("Sentry config failed: " + err);
    }
  }
};

const ParseDefaultFilters = settingsElement => {
  let defaultFilters = [];
  if (
    settingsElement !== null &&
    settingsElement.dataset.defaultFiltersBase64 &&
    settingsElement.dataset.defaultFiltersBase64 !== "{{ .DefaultFilter }}"
  ) {
    // decode from base64 to a string
    const decoded = Buffer.from(
      settingsElement.dataset.defaultFiltersBase64,
      "base64"
    ).toString("ascii");
    // parse decoded string as JSON
    const json = JSON.parse(decoded);
    // if we got an array then use it as default filters
    if (Array.isArray(json)) {
      defaultFilters = json;
    }
  }
  return defaultFilters;
};

const ParseUIDefaults = b64data => {
  const decoded = Buffer.from(b64data, "base64").toString("ascii");
  try {
    return JSON.parse(decoded);
  } catch {
    return undefined;
  }
};

export { SettingsElement, SetupSentry, ParseDefaultFilters, ParseUIDefaults };
