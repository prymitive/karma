import React from "react";

import { mount, shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher
} from "Stores/SilenceFormStore";
import { SilenceForm } from "./SilenceForm";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeAll(() => {
  fetch.mockResponse(JSON.stringify([]));
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

const ShallowSilenceForm = () => {
  return shallow(
    <SilenceForm
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
    />
  );
};

const MountedSilenceForm = () => {
  return mount(
    <SilenceForm
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
    />
  );
};

describe("<SilenceForm /> matchers", () => {
  it("has an empty matcher selects on default render", () => {
    const tree = ShallowSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(1);
    expect(silenceFormStore.data.matchers).toHaveLength(1);
  });

  it("clicking 'Add more' button adds another matcher", () => {
    const tree = ShallowSilenceForm();
    const button = tree.find("button[type='button']");
    button.simulate("click", { preventDefault: jest.fn() });
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(2);
    expect(silenceFormStore.data.matchers).toHaveLength(2);
  });

  it("trash icon is not visible when there's only one matcher", () => {
    const tree = MountedSilenceForm();
    expect(silenceFormStore.data.matchers).toHaveLength(1);

    const matcher = tree.find("SilenceMatch");
    const button = matcher.find("button");
    expect(button).toHaveLength(0);
  });

  it("trash icon is visible when there are two matchers", () => {
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    const tree = MountedSilenceForm();
    expect(silenceFormStore.data.matchers).toHaveLength(2);

    const matcher = tree.find("SilenceMatch");
    const button = matcher.find("button");
    expect(button).toHaveLength(2);
  });

  it("clicking trash icon on a matcher select removes it", () => {
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    const tree = MountedSilenceForm();
    expect(silenceFormStore.data.matchers).toHaveLength(3);

    const matchers = tree.find("SilenceMatch");
    const toDelete = matchers.at(1);
    const button = toDelete.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.matchers).toHaveLength(2);
  });
});

describe("<SilenceForm /> preview", () => {
  it("doesn't render PayloadPreview when previewCollapse.hidden is true", () => {
    const tree = ShallowSilenceForm();
    const instance = tree.instance();
    instance.previewCollapse.hidden = true;
    expect(tree.find("PayloadPreview")).toHaveLength(0);
  });

  it("renders PayloadPreview when previewCollapse.hidden is false", () => {
    const tree = ShallowSilenceForm();
    const instance = tree.instance();
    instance.previewCollapse.hidden = false;
    expect(tree.find("PayloadPreview")).toHaveLength(1);
  });

  it("clicking on the toggle icon toggles PayloadPreview", () => {
    const tree = ShallowSilenceForm();
    const button = tree.find(".btn.cursor-pointer.text-muted");
    expect(tree.find("PayloadPreview")).toHaveLength(0);
    button.simulate("click");
    expect(tree.find("PayloadPreview")).toHaveLength(1);
    button.simulate("click");
    expect(tree.find("PayloadPreview")).toHaveLength(0);
  });
});

describe("<SilenceForm /> inputs", () => {
  it("default author value comes from Settings store", () => {
    settingsStore.silenceFormConfig.config.author = "foo@example.com";
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.props().value).toBe("foo@example.com");
    expect(silenceFormStore.data.author).toBe("foo@example.com");
  });

  it("default author value comes from the API response if present", () => {
    alertStore.settings.values.silenceForm.author = "bar@example.com";
    settingsStore.silenceFormConfig.config.author = "foo@example.com";
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.props().value).toBe("bar@example.com");
  });

  it("author value from the API response is saved to the Settings store", () => {
    alertStore.settings.values.silenceForm.author = "bar@example.com";
    settingsStore.silenceFormConfig.config.author = "";
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.props().value).toBe("bar@example.com");
    expect(settingsStore.silenceFormConfig.config.author).toBe(
      "bar@example.com"
    );
  });

  it("default author value is empty if nothing is stored in Settings", () => {
    settingsStore.silenceFormConfig.config.author = "";
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.text()).toBe("");
    expect(silenceFormStore.data.author).toBe("");
  });

  it("changing author input updates SilenceFormStore", () => {
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    input.simulate("change", { target: { value: "me@example.com" } });
    expect(silenceFormStore.data.author).toBe("me@example.com");
  });

  it("changing comment input updates SilenceFormStore", () => {
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Comment']");
    input.simulate("change", { target: { value: "fake comment" } });
    expect(silenceFormStore.data.comment).toBe("fake comment");
  });
});

describe("<SilenceForm />", () => {
  it("calling submit doesn't move the form to Preview stage when form is invalid", () => {
    const tree = ShallowSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.UserInput);
  });

  it("calling submit move form to the 'Preview' stage when form is valid", () => {
    const matcher = NewEmptyMatcher();
    matcher.name = "job";
    matcher.values = [{ label: "node_exporter", value: "node_exporter" }];
    silenceFormStore.data.matchers = [matcher];
    silenceFormStore.data.alertmanagers = [{ label: "am1", value: ["am1"] }];
    silenceFormStore.data.author = "me@example.com";
    silenceFormStore.data.comment = "fake silence";
    const tree = ShallowSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.Preview);
  });

  it("calling submit saves author value to the Settings store", () => {
    silenceFormStore.data.author = "user@example.com";
    const tree = ShallowSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(settingsStore.silenceFormConfig.config.author).toBe(
      "user@example.com"
    );
  });
});

describe("<SilenceForm /> in edit mode", () => {
  it("opening form with silenceID set disables AlertManagerInput", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = MountedSilenceForm();
    const select = tree.find("StateManager").at(0);
    expect(select.props().isDisabled).toBe(true);
  });

  it("opening form with silenceID shows reset button", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-outline-danger");
    expect(button).toHaveLength(1);
  });

  it("clicking on Reset button unsets silenceFormStore.data.silenceID", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-outline-danger");
    button.simulate("click");
    expect(silenceFormStore.data.silenceID).toBeNull();
  });

  it("clicking on Reset button hides it", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-outline-danger");
    button.simulate("click");
    expect(tree.find("button.btn-outline-danger")).toHaveLength(0);
  });

  it("clicking on Reset button enables AlertManagerInput", () => {
    silenceFormStore.data.silenceID = "12345";
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-outline-danger");
    button.simulate("click");
    const select = tree.find("StateManager").at(0);
    expect(select.props().isDisabled).toBeFalsy();
  });
});
