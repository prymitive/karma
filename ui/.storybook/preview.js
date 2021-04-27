import { configure, getStorybook, addDecorator } from "@storybook/react";

import { advanceTo } from "jest-date-mock";

import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";

import { config } from "react-transition-group";

config.disabled = true;

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
            animations: {
              duration: 0,
            },
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
            animations: {
              duration: 0,
            },
          }}
        >
          {story()}
        </ThemeContext.Provider>
      </div>
    </div>
  );
});

const req = require.context("../src/Components", true, /\.stories\.tsx$/);

function loadStories() {
  req.keys().forEach((filename) => req(filename));
}

configure(loadStories, module);

export const parameters = {
  layout: "fullscreen",
};
