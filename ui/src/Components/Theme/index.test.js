import React from "react";

import { mount } from "enzyme";

import { Settings } from "Stores/Settings";
import { Theme } from ".";

let settingsStore;

beforeEach(() => {
  settingsStore = new Settings();
});

describe("<Theme />", () => {
  it("renders DarkTheme when settingsStore.themeConfig.config.darkTheme is true", () => {
    settingsStore.themeConfig.config.darkTheme = true;
    const tree = mount(<Theme settingsStore={settingsStore} />);
    expect(tree.text()).toBe("");
  });

  it("renders LightTheme when settingsStore.themeConfig.config.darkTheme is false", () => {
    settingsStore.themeConfig.config.darkTheme = false;
    const tree = mount(<Theme settingsStore={settingsStore} />);
    expect(tree.text()).toBe("");
  });
});
