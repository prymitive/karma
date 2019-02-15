import React from "react";

import { shallow, mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertManagerInput } from ".";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.data.upstreams.clusters = {
    ha: ["am1", "am2"],
    am3: ["am3"]
  };
  alertStore.data.upstreams.instances = [
    {
      name: "am1",
      uri: "http://am1.example.com",
      publicURI: "http://am1.example.com",
      error: "",
      version: "0.15.0",
      cluster: "ha",
      clusterMembers: ["am1", "am2"]
    },
    {
      name: "am2",
      uri: "http://am2.example.com",
      publicURI: "http://am2.example.com",
      error: "",
      version: "0.15.0",
      cluster: "ha",
      clusterMembers: ["am1", "am2"]
    },
    {
      name: "am3",
      uri: "http://am3.example.com",
      publicURI: "http://am3.example.com",
      error: "",
      version: "0.15.0",
      cluster: "am3",
      clusterMembers: ["am3"]
    }
  ];
  silenceFormStore = new SilenceFormStore();
});

const ShallowAlertManagerInput = () => {
  return shallow(
    <AlertManagerInput
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const MountedAlertManagerInput = () => {
  return mount(
    <AlertManagerInput
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const ValidateSuggestions = () => {
  const tree = MountedAlertManagerInput();
  // clear all selected instances, they are selected by default
  const clear = tree.find("ClearIndicator");
  // https://github.com/JedWatson/react-select/blob/c22d296d50917e210836fb011ae3e565895e6440/src/__tests__/Select.test.js#L1873
  clear.simulate("mousedown", { button: 0 });
  // click on the react-select component doesn't seem to trigger options
  // rendering in tests, so change the input instead
  tree.find("input").simulate("change", { target: { value: "am" } });
  return tree;
};

describe("<AlertManagerInput />", () => {
  it("matches snapshot", () => {
    const tree = ShallowAlertManagerInput();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't render ValidationError after passed validation", () => {
    const tree = ShallowAlertManagerInput();
    silenceFormStore.data.wasValidated = true;
    expect(tree.html()).not.toMatch(/fa-exclamation-circle/);
    expect(tree.html()).not.toMatch(/Required/);
  });

  it("renders ValidationError after failed validation", () => {
    const tree = ShallowAlertManagerInput();
    silenceFormStore.data.alertmanagers = [];
    silenceFormStore.data.wasValidated = true;
    expect(tree.html()).toMatch(/fa-exclamation-circle/);
    expect(tree.html()).toMatch(/Required/);
  });

  it("all available Alertmanager instances are selected by default", () => {
    ShallowAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am1 | am2",
      value: ["am1", "am2"]
    });
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"]
    });
  });

  it("doesn't override last selected Alertmanager instances on mount", () => {
    silenceFormStore.data.alertmanagers = [{ label: "am3", value: ["am3"] }];
    ShallowAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"]
    });
  });

  it("renders all 3 suggestions", () => {
    const tree = ValidateSuggestions();
    const options = tree.find(".react-select__option");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("am1 | am2");
    expect(options.at(1).text()).toBe("am3");
  });

  it("clicking on options appends them to silenceFormStore.data.alertmanagers", () => {
    silenceFormStore.data.alertmanagers = [];
    const tree = ValidateSuggestions();
    const options = tree.find(".react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am1 | am2",
      value: ["am1", "am2"]
    });
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"]
    });
  });

  it("silenceFormStore.data.alertmanagers gets updated from alertStore.data.upstreams.instances on mismatch", () => {
    const tree = ShallowAlertManagerInput();
    alertStore.data.upstreams.clusters = {
      amNew: ["amNew"]
    };
    // force update since this is where the mismatch check lives
    tree.instance().componentDidUpdate();
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "amNew",
      value: ["amNew"]
    });
  });

  it("is enabled when silenceFormStore.data.silenceID is null", () => {
    silenceFormStore.data.silenceID = null;
    const tree = MountedAlertManagerInput();
    const select = tree.find("StateManager");
    expect(select.props().isDisabled).toBeFalsy();
  });

  it("is disabled when silenceFormStore.data.silenceID is not null", () => {
    silenceFormStore.data.silenceID = "1234";
    const tree = MountedAlertManagerInput();
    const select = tree.find("StateManager");
    expect(select.props().isDisabled).toBe(true);
  });
});
