import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__fixtures__/Alerts";
import { MockThemeContext } from "__fixtures__/Theme";
import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { ManagedSilence, GetAlertmanager } from ".";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let cluster: string;
let silence: APISilenceT;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 0 },
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
  });

  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  clear();
});

const MountedManagedSilence = (onDidUpdate?: () => void) => {
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
    tree.find("svg.text-muted.cursor-pointer").simulate("click");
    const details = tree.find("SilenceDetails");
    expect(details).toHaveLength(1);
  });

  it("matches snapshot with expaned details", () => {
    const tree = MountedManagedSilence();
    tree.find("svg.text-muted.cursor-pointer").simulate("click");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("GetAlertmanager() returns alertmanager object from alertStore.data.upstreams.instances", () => {
    const am = GetAlertmanager(alertStore, cluster);
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

  it("GetAlertmanager() returns only writable instances", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
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
    });

    const am = GetAlertmanager(alertStore, cluster);
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
    tree.find("svg.text-muted.cursor-pointer").simulate("click");

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Edit");
  });

  it("shows Delete button on unexpired silence", () => {
    const tree = MountedManagedSilence();
    tree.find("svg.text-muted.cursor-pointer").simulate("click");

    const button = tree.find(".btn-danger");
    expect(button.text()).toBe("Delete");
  });

  it("shows Recreate button on expired silence", () => {
    advanceTo(new Date(Date.UTC(2000, 0, 1, 23, 30, 0)));
    const tree = MountedManagedSilence();
    tree.find("svg.text-muted.cursor-pointer").simulate("click");

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Recreate");
  });

  it("clicking on Edit calls", () => {
    const tree = MountedManagedSilence();
    tree.find("svg.text-muted.cursor-pointer").simulate("click");

    expect(silenceFormStore.data.silenceID).toBeNull();

    const button = tree.find(".btn-primary");
    expect(button.text()).toBe("Edit");

    button.simulate("click");
    expect(silenceFormStore.data.silenceID).toBe(silence.id);
  });

  it("call onDidUpdate if passed", () => {
    const fakeUpdate = jest.fn();
    const tree = MountedManagedSilence(fakeUpdate);
    tree.find("svg.text-muted.cursor-pointer").simulate("click");
    expect(fakeUpdate).toHaveBeenCalled();
  });
});
