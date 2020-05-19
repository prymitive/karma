import React from "react";
import {
  configure,
  getStorybook,
  setAddon,
  addDecorator,
} from "@storybook/react";

import createPercyAddon from "@percy-io/percy-storybook";

import { withPerformance } from "storybook-addon-performance";

import "mobx-react-lite/batchingForReactDom";

import { advanceTo } from "jest-date-mock";

import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";

const { percyAddon, serializeStories } = createPercyAddon();
setAddon(percyAddon);

// mock date so the silence form always shows same preview
advanceTo(new Date(Date.UTC(2018, 7, 14, 17, 36, 40)));

addDecorator((story) => {
  document.body.style = "";
  return story();
});
addDecorator((story) => {
  return (
    <div>
      <div className="theme-light">
        <ThemeContext.Provider
          value={{
            reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
          }}
        >
          {story()}
        </ThemeContext.Provider>
      </div>
      <div
        style={{
          height: "16px",
          width: "100%",
          backgroundColor: "#eee",
          marginTop: "4px",
          marginBottom: "4px",
        }}
      ></div>
      <div className="theme-dark">
        <ThemeContext.Provider
          value={{
            reactSelectStyles: ReactSelectStyles(ReactSelectColors.Dark),
          }}
        >
          {story()}
        </ThemeContext.Provider>
      </div>
    </div>
  );
});
addDecorator(withPerformance);

const req = require.context("../src/Components", true, /\.stories\.(js|tsx)$/);

function loadStories() {
  req.keys().forEach((filename) => req(filename));
}

configure(loadStories, module);

serializeStories(getStorybook);
