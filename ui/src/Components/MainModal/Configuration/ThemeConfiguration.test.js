import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { ThemeConfiguration } from "./ThemeConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return mount(<ThemeConfiguration settingsStore={settingsStore} />);
};

describe("<ThemeConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("darkTheme is 'false' by default", () => {
    expect(settingsStore.themeConfig.config.darkTheme).toBe(false);
  });

  it("unchecking the checkbox sets stored darkTheme value to 'false'", done => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-theme");

    settingsStore.themeConfig.config.darkTheme = true;
    expect(settingsStore.themeConfig.config.darkTheme).toBe(true);
    checkbox.simulate("change", { target: { checked: false } });
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.darkTheme).toBe(false);
      done();
    }, 200);
  });

  it("checking the checkbox sets stored darkTheme value to 'true'", done => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-theme");

    settingsStore.themeConfig.config.darkTheme = false;
    expect(settingsStore.themeConfig.config.darkTheme).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.darkTheme).toBe(true);
      done();
    }, 200);
  });
});
