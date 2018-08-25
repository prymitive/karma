// helpers used to bootstrap App instance and environment for it

import Raven from "raven-js";

const SettingsElement = () => document.getElementById("settings");

const SetupRaven = settingsElement => {
  if (
    settingsElement !== null &&
    settingsElement.dataset.ravenDsn &&
    settingsElement.dataset.ravenDsn !== "{{ .SentryDSN }}"
  ) {
    let version = "unknown";
    if (
      settingsElement.dataset.version &&
      settingsElement.dataset.version !== "{{ .Version }}"
    ) {
      version = settingsElement.dataset.version;
    }

    const ravenClient = new Raven.Client();
    try {
      ravenClient
        .config(settingsElement.dataset.ravenDsn, {
          release: version
        })
        .install();
    } catch (err) {
      console.error("Raven config failed: " + err);
    }
    return ravenClient;
  }
  return null;
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

export { SettingsElement, SetupRaven, ParseDefaultFilters };
