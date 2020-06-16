// MUST be first thing we import
// https://github.com/facebook/create-react-app/blob/master/packages/react-app-polyfill/README.md
// IE is not supported (lacks Proxy) but that pollyfill provides fetch and other needed features
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

import React from "react";
import ReactDOM from "react-dom";

import "mobx-react-lite/batchingForReactDom";

import {
  SettingsElement,
  SetupSentry,
  ParseDefaultFilters,
  ParseUIDefaults,
} from "./AppBoot";
import { App } from "./App";

SetupSentry(SettingsElement());

// https://wetainment.com/testing-indexjs/
export default ReactDOM.render(
  <App
    defaultFilters={ParseDefaultFilters(SettingsElement())}
    uiDefaults={ParseUIDefaults(document.getElementById("defaults"))}
  />,
  document.getElementById("root")
);
