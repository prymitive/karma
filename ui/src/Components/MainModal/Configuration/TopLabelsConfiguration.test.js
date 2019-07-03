import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { TopLabelsConfiguration } from "./TopLabelsConfiguration";

let settingsStore;
beforeEach(() => {
  settingsStore = new Settings();
});

const FakeConfiguration = () => {
  return mount(<TopLabelsConfiguration settingsStore={settingsStore} />);
};

describe("<TopLabelsConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("show is 'true' by default", () => {
    expect(settingsStore.topLabelsConfig.config.show).toBe(true);
  });

  it("unchecking the 'show' checkbox settingsStore.topLabelsConfig.config.show value to 'false'", done => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#topLabelsConfigShow");

    settingsStore.topLabelsConfig.config.show = true;
    expect(settingsStore.topLabelsConfig.config.show).toBe(true);
    checkbox.simulate("change", { target: { checked: false } });
    setTimeout(() => {
      expect(settingsStore.topLabelsConfig.config.show).toBe(false);
      done();
    }, 200);
  });

  it("checking the 'show' checkbox settingsStore.topLabelsConfig.config.show value to 'true'", done => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#topLabelsConfigShow");

    settingsStore.topLabelsConfig.config.show = false;
    expect(settingsStore.topLabelsConfig.config.show).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.topLabelsConfig.config.show).toBe(true);
      done();
    }, 200);
  });

  it("call to onChangePercentStart() updates internal state", () => {
    const tree = FakeConfiguration();
    tree.instance().onChangePercentStart(55);
    expect(tree.instance().config.minPercent).toBe(55);
  });

  it("settings are updated on completed minPercent change", () => {
    const tree = FakeConfiguration();
    tree.instance().onChangePercentComplete(66);
    expect(settingsStore.topLabelsConfig.config.minPercent).toBe(66);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.topLabelsConfig.config.minPercent = 77;
    const component = FakeConfiguration();
    expect(component.find("InputRange").props().value).toBe(77);
  });
});
