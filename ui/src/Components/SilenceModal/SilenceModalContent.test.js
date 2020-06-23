import React from "react";

import { mount } from "enzyme";

import { MockThemeContext } from "__mocks__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import {
  SilenceFormStore,
  SilenceFormStage,
  SilenceTabNames,
} from "Stores/SilenceFormStore";
import { SilenceModalContent } from "./SilenceModalContent";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeEach(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);

  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        uri: "http://localhost:9093",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
      },
    ],
    clusters: { am: ["am1"] },
  };

  silenceFormStore.tab.current = SilenceTabNames.Editor;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MockOnHide = jest.fn();

const MountedSilenceModalContent = () => {
  return mount(
    <SilenceModalContent
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
      onHide={MockOnHide}
      onDeleteModalClose={jest.fn()}
    />
  );
};

describe("<SilenceModalContent />", () => {
  it("Renders ReadOnlyPlaceholder when there are no writable Alertmanager upstreams", () => {
    alertStore.data.upstreams.instances[0].readonly = true;
    const tree = MountedSilenceModalContent();
    const placeholder = tree.find("ReadOnlyPlaceholder");
    expect(placeholder).toHaveLength(1);
  });

  it("Clicking on the Browser tab changes content", () => {
    const tree = MountedSilenceModalContent();
    const tabs = tree.find("Tab");
    tabs.at(1).simulate("click");
    tree.update();
    const form = tree.find("Browser");
    expect(form).toHaveLength(1);
  });

  it("Clicking on the Editor tab changes content", () => {
    silenceFormStore.tab.current = SilenceTabNames.Browser;
    const tree = MountedSilenceModalContent();
    const tabs = tree.find("Tab");
    tabs.at(0).simulate("click");
    const form = tree.find("SilenceForm");
    expect(form).toHaveLength(1);
  });

  it("Content is not blurred when silenceFormStore.toggle.blurred is false", () => {
    silenceFormStore.toggle.blurred = false;
    const tree = MountedSilenceModalContent();
    expect(tree.find("div.modal-body.modal-content-blur")).toHaveLength(0);
  });

  it("Content is blurred when silenceFormStore.toggle.blurred is true", () => {
    silenceFormStore.toggle.blurred = true;
    const tree = MountedSilenceModalContent();
    expect(tree.find("div.modal-body.modal-content-blur")).toHaveLength(1);
  });
});

describe("<SilenceModalContent /> Editor", () => {
  it("title is 'New silence' when creating new silence", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.UserInput;
    silenceFormStore.data.silenceID = null;
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("New silence");
  });
  it("title is 'Editing silence' when editing exiting silence", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.UserInput;
    silenceFormStore.data.silenceID = "1234";
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Editing silence");
  });
  it("title is 'Preview silenced alerts' when previewing silenced alerts", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Preview;
    silenceFormStore.data.silenceID = "1234";
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Preview silenced alerts");
  });
  it("title is 'Silence submitted' after sending silence to Alertmanager", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Submit;
    silenceFormStore.data.silenceID = "1234";
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Silence submitted");
  });

  it("renders SilenceForm when silenceFormStore.data.currentStage is 'UserInput'", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.UserInput;
    const tree = MountedSilenceModalContent();
    const form = tree.find("SilenceForm");
    expect(form).toHaveLength(1);
  });

  it("renders SilencePreview when silenceFormStore.data.currentStage is 'Preview'", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Preview;
    const tree = MountedSilenceModalContent();
    const ctrl = tree.find("SilencePreview");
    expect(ctrl).toHaveLength(1);
  });

  it("renders SilenceSubmitController when silenceFormStore.data.currentStage is 'Submit'", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Submit;
    const tree = MountedSilenceModalContent();
    expect(tree.html()).toMatchSnapshot();
  });
});

describe("<SilenceModalContent /> Browser", () => {
  it("renders silence browser when tab is set to Browser", () => {
    silenceFormStore.tab.current = SilenceTabNames.Browser;
    const tree = MountedSilenceModalContent();
    const form = tree.find("Browser");
    expect(form).toHaveLength(1);
  });
});
