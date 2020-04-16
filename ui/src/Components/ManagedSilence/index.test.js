import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { MockThemeContext } from "__mocks__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { ManagedSilence } from ".";

let alertStore;
let silenceFormStore;
let cluster;
let silence;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://example.com",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  };

  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
  clear();
});

const MountedManagedSilence = (onDidUpdate) => {
  return mount(
    <ManagedSilence
      cluster={cluster}
      alertCount={123}
      alertCountAlwaysVisible={true}
      silence={silence}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      onDidUpdate={onDidUpdate}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<ManagedSilence />", () => {
  it("matches snapshot when collapsed", () => {
    const tree = MountedManagedSilence();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("clicking on expand toggle shows silence details", () => {
    const tree = MountedManagedSilence();
    const toggle = tree.find("svg.text-muted.cursor-pointer");
    toggle.simulate("click");
    const details = tree.find("SilenceDetails");
    expect(details).toHaveLength(1);
  });

  it("matches snapshot with expaned details", () => {
    const tree = MountedManagedSilence();
    tree.instance().collapse.toggle();
    tree.update();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("getAlertmanager() returns alertmanager object from alertStore.data.upstreams.instances", () => {
    const tree = MountedManagedSilence();
    const instance = tree.instance();
    const am = instance.getAlertmanager();
    expect(am).toEqual({
      name: "am1",
      cluster: "am",
      clusterMembers: ["am1"],
      uri: "http://localhost:9093",
      publicURI: "http://example.com",
      readonly: false,
      error: "",
      version: "0.17.0",
      headers: {},
      corsCredentials: "include",
    });
  });

  it("getAlertmanager() returns only writable instances", () => {
    alertStore.data.upstreams = {
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "http://localhost:9093",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.17.0",
          headers: {},
          corsCredentials: "include",
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "http://localhost:9094",
          publicURI: "http://example.com",
          readonly: true,
          error: "",
          version: "0.17.0",
          headers: {},
          corsCredentials: "include",
        },
      ],
      clusters: { am: ["am1", "am2"] },
    };

    const tree = MountedManagedSilence();
    const instance = tree.instance();
    const am = instance.getAlertmanager();
    expect(am).toEqual({
      name: "am1",
      cluster: "am",
      clusterMembers: ["am1"],
      uri: "http://localhost:9093",
      publicURI: "http://example.com",
      readonly: false,
      error: "",
      version: "0.17.0",
      headers: {},
      corsCredentials: "include",
    });
  });

  it("shows Edit button on unexpired silence", () => {
    const tree = MountedManagedSilence();
    tree.instance().collapse.toggle();
    tree.update();

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Edit");
  });

  it("shows Delete button on unexpired silence", () => {
    const tree = MountedManagedSilence();
    tree.instance().collapse.toggle();
    tree.update();

    const button = tree.find(".btn-danger");
    expect(button.text()).toBe("Delete");
  });

  it("shows Recreate button on expired silence", () => {
    advanceTo(moment.utc([2000, 0, 1, 23, 30, 0]));
    const tree = MountedManagedSilence();
    tree.instance().collapse.toggle();
    tree.update();

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Recreate");
  });

  it("clicking on Edit calls ", () => {
    const tree = MountedManagedSilence();
    tree.instance().collapse.toggle();
    tree.update();

    expect(silenceFormStore.data.silenceID).toBeNull();

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Edit");

    const fillSpy = jest.spyOn(silenceFormStore.data, "fillFormFromSilence");
    button.simulate("click");
    expect(silenceFormStore.data.silenceID).toBe(silence.id);
    expect(fillSpy).toHaveBeenCalled();
  });

  it("call onDidUpdate if passed", () => {
    const fakeUpdate = jest.fn();
    const tree = MountedManagedSilence(fakeUpdate);
    tree.instance().collapse.toggle();
    tree.update();
    expect(fakeUpdate).toHaveBeenCalled();
  });
});
