// MUST be first thing we import
// https://github.com/facebook/create-react-app/blob/master/packages/react-app-polyfill/README.md
// IE is not supported (lacks Proxy) but that pollyfill provides fetch and other needed features
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

// https://www.npmjs.com/package/react-intersection-observer#polyfill
import "intersection-observer";

import React from "react";
import ReactDOM from "react-dom";

import Moment from "react-moment";

import "mobx-react-lite/batchingForReactDom";

import {
  SettingsElement,
  SetupSentry,
  ParseDefaultFilters,
  ParseUIDefaults,
} from "./AppBoot";
import { App } from "./App";

SetupSentry(SettingsElement());

// global timer for updating timestamps to human readable offsets
// this needs to be run before any <Moment/> instance
// https://www.npmjs.com/package/react-moment#pooled-timer
Moment.startPooledTimer();

// https://wetainment.com/testing-indexjs/
export default ReactDOM.render(
  <App
    defaultFilters={ParseDefaultFilters(SettingsElement())}
    uiDefaults={ParseUIDefaults(document.getElementById("defaults"))}
  />,
  document.getElementById("root")
);
