import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceFormStage } from "Stores/SilenceFormStore";
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
    silenceFormStore.data.alertmanagers.push({ label: "am1", value: ["am1"] });
    silenceFormStore.data.alertmanagers.push({
      label: "ha",
      value: ["am2", "am3"],
    });
    const tree = ShallowSilenceSubmitController();
    const alertmanagers = tree.find("SilenceSubmitProgress");
    expect(alertmanagers).toHaveLength(2);
  });

  it("resets the form on 'Back' button click", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Submit;
    const tree = ShallowSilenceSubmitController();
    const button = tree.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.UserInput);
  });
});
