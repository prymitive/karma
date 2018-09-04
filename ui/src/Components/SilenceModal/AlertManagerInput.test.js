import React from "react";

import { shallow, mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertManagerInput } from "./AlertManagerInput";

let alertStore;
let silenceFormStore;

const AlertmanagerOption = index => ({
  label: `am${index}`,
  value: `http://am${index}.example.com`
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.data.upstreams.instances = [
    { name: "am1", uri: "http://am1.example.com", error: "" },
    { name: "am2", uri: "http://am2.example.com", error: "" },
    { name: "am3", uri: "http://am3.example.com", error: "" }
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
    expect(tree).toMatchSnapshot();
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
    expect(silenceFormStore.data.alertmanagers).toHaveLength(3);
    for (let i = 1; i <= 3; i++) {
      expect(silenceFormStore.data.alertmanagers).toContainEqual(
        AlertmanagerOption(i)
      );
    }
  });

  it("doesn't override last selected Alertmanager instances on mount", () => {
    silenceFormStore.data.alertmanagers = [AlertmanagerOption(1)];
    ShallowAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual(
      AlertmanagerOption(1)
    );
  });

  it("renders all 3 suggestions", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("[role='option']");
    expect(options).toHaveLength(3);
    expect(options.at(0).text()).toBe("am1");
    expect(options.at(1).text()).toBe("am2");
    expect(options.at(2).text()).toBe("am3");
  });

  it("clicking on options appends them to silenceFormStore.data.alertmanagers", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("[role='option']");
    options.at(0).simulate("click");
    options.at(2).simulate("click");
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);
    expect(silenceFormStore.data.alertmanagers).toContainEqual(
      AlertmanagerOption(1)
    );
    expect(silenceFormStore.data.alertmanagers).toContainEqual(
      AlertmanagerOption(3)
    );
  });

  it("silenceFormStore.data.alertmanagers gets updated from alertStore.data.upstreams.instances on mismatch", () => {
    const tree = ShallowAlertManagerInput();
    alertStore.data.upstreams.instances[0] = {
      name: "am1",
      uri: "http://am1.example.com/new",
      error: ""
    };
    // force update since this is where the mismatch check lives
    tree.instance().componentDidUpdate();
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am1",
      value: "http://am1.example.com/new"
    });
  });
});
