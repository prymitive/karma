import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { Configuration } from ".";

beforeEach(() => {
  fetch.mockResponse(JSON.stringify([]));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("<Configuration />", () => {
  it("matches snapshot", () => {
    const settingsStore = new Settings();
    const tree = mount(
      <ThemeContext.Provider
        value={{
          reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
        }}
      >
        <Configuration settingsStore={settingsStore} defaultIsOpen={true} />
      </ThemeContext.Provider>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
