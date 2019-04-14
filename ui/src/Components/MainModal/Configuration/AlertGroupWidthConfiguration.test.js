import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return mount(<AlertGroupWidthConfiguration settingsStore={settingsStore} />);
};

describe("<AlertGroupWidthConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("call to onChange() updates internal state", () => {
    const tree = FakeConfiguration();
    tree.instance().onChange(500);
    expect(tree.instance().config.groupWidth).toBe(500);
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    tree.instance().onChangeComplete(555);
    expect(settingsStore.gridConfig.config.groupWidth).toBe(555);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.gridConfig.config.groupWidth = 455;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(455);
  });
});
