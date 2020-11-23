import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { Settings } from "Stores/Settings";
import { AlertGroupCollapseConfiguration } from "./AlertGroupCollapseConfiguration";

let settingsStore: Settings;

beforeEach(() => {
  settingsStore = new Settings(null);

  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

const FakeConfiguration = () => {
  return mount(
    <AlertGroupCollapseConfiguration settingsStore={settingsStore} />
  );
};

describe("<AlertGroupCollapseConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("resets stored config to defaults if it is invalid", (done) => {
    (settingsStore.alertGroupConfig.config
      .defaultCollapseState as string) = "foo";
    const tree = FakeConfiguration();
    const select = tree.find("div.react-select__value-container");
    expect(select.text()).toBe(
      settingsStore.alertGroupConfig.options.collapsedOnMobile.label
    );
    setTimeout(() => {
      expect(settingsStore.alertGroupConfig.config.defaultCollapseState).toBe(
        settingsStore.alertGroupConfig.options.collapsedOnMobile.value
      );
      done();
    }, 200);
  });

  it("rendered correct default value", (done) => {
    settingsStore.alertGroupConfig.setDefaultCollapseState("expanded");
    const tree = FakeConfiguration();
    const select = tree.find("div.react-select__value-container");
    setTimeout(() => {
      expect(select.text()).toBe(
        settingsStore.alertGroupConfig.options.expanded.label
      );
      done();
    }, 200);
  });

  it("clicking on a label option updates settingsStore", (done) => {
    const tree = FakeConfiguration();
    tree
      .find("input#react-select-configuration-collapse-input")
      .simulate("change", { target: { value: " " } });
    const options = tree.find("div.react-select__option");
    options.at(1).simulate("click");
    setTimeout(() => {
      expect(settingsStore.alertGroupConfig.config.defaultCollapseState).toBe(
        settingsStore.alertGroupConfig.options.collapsed.value
      );
      done();
    }, 200);
  });
});
