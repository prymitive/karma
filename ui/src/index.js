import React from "react";
import ReactDOM from "react-dom";

import Raven from "raven-js";

import Moment from "react-moment";

import { App } from "./App";

let defaultFilters = [];

// check if we have early settings
const settings = document.getElementById("settings");
if (settings !== null) {
  // sentry setup if sentry dsn is set
  if (
    settings.dataset.ravenDsn &&
    settings.dataset.ravenDsn !== "{{ .SentryDSN }}"
  ) {
    let version = "unknown";
    if (
      settings.dataset.version &&
      settings.dataset.version !== "{{ .Version }}"
    ) {
      version = settings.dataset.version;
    }

    try {
      Raven.config(settings.dataset.ravenDsn, { release: version }).install();
    } catch (err) {
      console.error("Raven config failed: " + err);
    }
  }

  // default filters, JSON blob encoded with base64
  if (
    settings.dataset.defaultFiltersBase64 &&
    settings.dataset.defaultFiltersBase64 !== "{{ .DefaultFilter }}"
  ) {
    // decode from base64 to a string
    const decoded = Buffer.from(
      settings.dataset.defaultFiltersBase64,
      "base64"
    ).toString("ascii");
    // parse decoded string as JSON
    const json = JSON.parse(decoded);
    // if we got an array then use it as default filters
    if (Array.isArray(json)) {
      defaultFilters = json;
    }
  }
}

// global timer for updating timestamps to human readable offsets
// this needs to be run before any <Moment/> instance
// https://www.npmjs.com/package/react-moment#pooled-timer
Moment.startPooledTimer();

ReactDOM.render(
  <App defaultFilters={defaultFilters} />,
  document.getElementById("root")
);
