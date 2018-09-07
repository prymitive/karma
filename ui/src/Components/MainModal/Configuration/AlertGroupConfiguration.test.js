import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return mount(<AlertGroupConfiguration settingsStore={settingsStore} />);
};

describe("<AlertGroupConfiguration /> className", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("call to onChange() updates internal state", () => {
    const tree = FakeConfiguration();
    tree.instance().onChange(11);
    expect(tree.instance().config.defaultRenderCount).toBe(11);
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    tree.instance().onChangeComplete(96);
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(96);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.alertGroupConfig.config.defaultRenderCount = 55;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(55);
  });
});
