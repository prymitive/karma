// MUST be first thing we import
// https://babeljs.io/docs/en/babel-polyfill#usage-in-node-browserify-webpack
import "@babel/polyfill";

// fetch() polyfill for IE and some mobile browsers
import "whatwg-fetch";

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
