// MUST be first thing we import
import "./polyfills";

import { createRoot } from "react-dom/client";

import {
  SettingsElement,
  ParseDefaultFilters,
  ParseUIDefaults,
} from "./AppBoot";
import { App } from "./App";

// https://wetainment.com/testing-indexjs/
const root = createRoot(document.getElementById("root")!);
root.render(
  <App
    defaultFilters={ParseDefaultFilters(SettingsElement())}
    uiDefaults={ParseUIDefaults(document.getElementById("defaults"))}
  />,
);
