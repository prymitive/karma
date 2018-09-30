import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceModalContent } from "./SilenceModalContent";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

const MockOnHide = jest.fn();

const ShallowSilenceModalContent = () => {
  return shallow(
    <SilenceModalContent
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
      onHide={MockOnHide}
    />
  );
};

describe("<SilenceModalContent />", () => {
  it("renders SilenceForm when silenceFormStore.data.inProgress is false", () => {
    silenceFormStore.data.inProgress = false;
    const tree = ShallowSilenceModalContent();
    const form = tree.find("SilenceForm");
    expect(form).toHaveLength(1);
  });

  it("renders SilenceSubmitController when silenceFormStore.data.inProgress is true", () => {
    silenceFormStore.data.inProgress = true;
    const tree = ShallowSilenceModalContent();
    const ctrl = tree.find("SilenceSubmitController");
    expect(ctrl).toHaveLength(1);
  });

  it("title is 'Add new silence' when silenceFormStore.data.silenceID is null", () => {
    silenceFormStore.data.silenceID = null;
    const tree = ShallowSilenceModalContent();
    const title = tree.find(".modal-title");
    expect(title.text()).toBe("Add new silence");
  });

  it("title is 'Editing silence 12345' when silenceFormStore.data.silenceID is '12345'", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = ShallowSilenceModalContent();
    const title = tree.find(".modal-title");
    expect(title.text()).toBe("Editing silence 12345");
  });
});
