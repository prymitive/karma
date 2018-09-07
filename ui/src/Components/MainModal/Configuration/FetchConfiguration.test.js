import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { FetchConfiguration } from "./FetchConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return mount(<FetchConfiguration settingsStore={settingsStore} />);
};

describe("<FetchConfiguration /> className", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("call to onChange() updates internal state", () => {
    const tree = FakeConfiguration();
    tree.instance().onChange(55);
    expect(tree.instance().config.fetchInterval).toBe(55);
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    tree.instance().onChangeComplete(123);
    expect(settingsStore.fetchConfig.config.interval).toBe(123);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.fetchConfig.config.interval = 66;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(66);
  });
});
