// MUST be first thing we import
import "./polyfills";

import ReactDOM from "react-dom";

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
