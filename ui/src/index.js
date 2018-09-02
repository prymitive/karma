import React from "react";
import ReactDOM from "react-dom";

import Moment from "react-moment";

import { SettingsElement, SetupRaven, ParseDefaultFilters } from "./AppBoot";
import { App } from "./App";

const settingsElement = SettingsElement();

SetupRaven(settingsElement);

// global timer for updating timestamps to human readable offsets
// this needs to be run before any <Moment/> instance
// https://www.npmjs.com/package/react-moment#pooled-timer
Moment.startPooledTimer();

const defaultFilters = ParseDefaultFilters(settingsElement);

// https://wetainment.com/testing-indexjs/
export default ReactDOM.render(
  <App defaultFilters={defaultFilters} />,
  document.getElementById("root") || document.createElement("div")
);
