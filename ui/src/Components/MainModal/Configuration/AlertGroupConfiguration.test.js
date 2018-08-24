import React from "react";
import renderer from "react-test-renderer";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return renderer.create(
    <AlertGroupConfiguration settingsStore={settingsStore} />
  );
};

describe("<AlertGroupConfiguration /> className", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration().toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("call to onChange() updates internal state", () => {
    const tree = FakeConfiguration().toTree();
    tree.instance.onChange(11);
    expect(tree.instance.config.defaultRenderCount).toBe(11);
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration().toTree();
    tree.instance.onChangeComplete(96);
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(96);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.alertGroupConfig.config.defaultRenderCount = 55;
    const component = FakeConfiguration();
    expect(component.root.findByType(InputRange).props.value).toBe(55);
  });
});
