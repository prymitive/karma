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

describe("<FetchConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.fetchConfig.config.interval).toBe(30);

    const slider = tree.find(`Slider [onKeyDown]`).first();

    slider.simulate("keyDown", { keyCode: 37 });
    slider.simulate("keyUp", { keyCode: 37 });

    expect(settingsStore.fetchConfig.config.interval).toBe(20);

    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });
    slider.simulate("keyDown", { keyCode: 39 });
    slider.simulate("keyUp", { keyCode: 39 });

    expect(settingsStore.fetchConfig.config.interval).toBe(40);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.fetchConfig.config.interval = 66;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(66);
  });
});
