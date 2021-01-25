import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { SilenceModalContent } from "./SilenceModalContent";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();

  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://localhost:9093",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  });

  silenceFormStore.tab.current = "editor";
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
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
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
    silenceFormStore.tab.current = "browser";
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
    silenceFormStore.data.currentStage = "form";
    silenceFormStore.data.silenceID = null;
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("New silence");
  });
  it("title is 'Editing silence' when editing exiting silence", () => {
    silenceFormStore.data.currentStage = "form";
    silenceFormStore.data.setSilenceID("1234");
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Editing silence");
  });
  it("title is 'Preview silenced alerts' when previewing silenced alerts", () => {
    silenceFormStore.data.currentStage = "preview";
    silenceFormStore.data.setSilenceID("1234");
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Preview silenced alerts");
  });
  it("title is 'Silence submitted' after sending silence to Alertmanager", () => {
    silenceFormStore.data.currentStage = "submit";
    silenceFormStore.data.setSilenceID("1234");
    const tree = MountedSilenceModalContent();
    const tab = tree.find("Tab").at(0);
    expect(tab.props().title).toBe("Silence submitted");
  });

  it("renders SilenceForm when silenceFormStore.data.currentStage is 'UserInput'", () => {
    silenceFormStore.data.currentStage = "form";
    const tree = MountedSilenceModalContent();
    const form = tree.find("SilenceForm");
    expect(form).toHaveLength(1);
  });

  it("renders SilencePreview when silenceFormStore.data.currentStage is 'Preview'", () => {
    silenceFormStore.data.currentStage = "preview";
    const tree = MountedSilenceModalContent();
    const ctrl = tree.find("SilencePreview");
    expect(ctrl).toHaveLength(1);
  });

  it("renders SilenceSubmitController when silenceFormStore.data.currentStage is 'Submit'", () => {
    silenceFormStore.data.currentStage = "submit";
    const tree = MountedSilenceModalContent();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

describe("<SilenceModalContent /> Browser", () => {
  it("renders silence browser when tab is set to Browser", () => {
    silenceFormStore.tab.current = "browser";
    const tree = MountedSilenceModalContent();
    const form = tree.find("Browser");
    expect(form).toHaveLength(1);
  });
});
