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

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.gridConfig.config.groupWidth).toBe(420);

    const slider = tree.find(`Slider [onKeyDown]`).first();

    slider.simulate("keyDown", { keyCode: 37 });
    slider.simulate("keyUp", { keyCode: 37 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(400);

    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });
    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(440);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.gridConfig.config.groupWidth = 455;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(455);
  });
});
