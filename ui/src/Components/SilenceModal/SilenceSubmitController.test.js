import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  MatcherValueToObject
} from "Stores/SilenceFormStore";
import { SilenceSubmitController } from "./SilenceSubmitController";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
});

const ShallowSilenceSubmitController = () => {
  return shallow(
    <SilenceSubmitController
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<SilenceSubmitController />", () => {
  it("renders all passed SilenceSubmitProgress", () => {
    silenceFormStore.data.alertmanagers.push(MatcherValueToObject("am1"));
    silenceFormStore.data.alertmanagers.push(MatcherValueToObject("am2"));
    const tree = ShallowSilenceSubmitController();
    const alertmanagers = tree.find("SilenceSubmitProgress");
    expect(alertmanagers).toHaveLength(2);
  });

  it("resets the form on 'Back' button click", () => {
    silenceFormStore.data.inProgress = true;
    const tree = ShallowSilenceSubmitController();
    const button = tree.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.inProgress).toBe(false);
  });
});
