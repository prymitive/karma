// MUST be first thing we import
// https://github.com/facebook/create-react-app/blob/master/packages/react-app-polyfill/README.md
// IE is not supported (lacks Proxy) but that pollyfill provides fetch and other needed features
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

import React from "react";
import ReactDOM from "react-dom";

import Moment from "react-moment";

import { SettingsElement, SetupSentry, ParseDefaultFilters } from "./AppBoot";
import { App } from "./App";

const settingsElement = SettingsElement();

SetupSentry(settingsElement);

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
