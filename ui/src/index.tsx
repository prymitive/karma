// MUST be first thing we import
import "./polyfills";

import ReactDOM from "react-dom";

import {
  SettingsElement,
  ParseDefaultFilters,
  ParseUIDefaults,
} from "./AppBoot";
import { App } from "./App";

// https://wetainment.com/testing-indexjs/
export default ReactDOM.render(
  <App
    defaultFilters={ParseDefaultFilters(SettingsElement())}
    uiDefaults={ParseUIDefaults(document.getElementById("defaults"))}
  />,
  document.getElementById("root"),
);
