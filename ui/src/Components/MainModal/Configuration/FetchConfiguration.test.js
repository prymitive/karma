import React from "react";
import renderer from "react-test-renderer";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";
import { FetchConfiguration } from "./FetchConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return renderer.create(<FetchConfiguration settingsStore={settingsStore} />);
};

describe("<FetchConfiguration /> className", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration().toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("call to onChange() updates internal state", () => {
    const tree = FakeConfiguration().toTree();
    tree.instance.onChange(55);
    expect(tree.instance.config.fetchInterval).toBe(55);
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration().toTree();
    tree.instance.onChangeComplete(123);
    expect(settingsStore.fetchConfig.config.interval).toBe(123);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.fetchConfig.config.interval = 66;
    const component = FakeConfiguration();
    expect(component.root.findByType(InputRange).props.value).toBe(66);
  });
});
