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

describe("<AlertGroupConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(5);

    const slider = tree.find(`Slider [onKeyDown]`).first();

    slider.simulate("keyDown", { keyCode: 37 });
    slider.simulate("keyUp", { keyCode: 37 });

    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(4);

    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });
    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(6);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.alertGroupConfig.config.defaultRenderCount = 4;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(4);
  });
});
