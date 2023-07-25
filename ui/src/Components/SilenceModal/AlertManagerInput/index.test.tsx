import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { AlertManagerInput } from ".";
import type { APIAlertsResponseUpstreamsT } from "Models/APITypes";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 3, healthy: 3, failed: 0 },
  instances: [
    {
      name: "am1",
      uri: "http://am1.example.com",
      publicURI: "http://am1.example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "HA",
      clusterMembers: ["am1", "am2"],
    },
    {
      name: "am2",
      uri: "http://am2.example.com",
      publicURI: "http://am2.example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "HA",
      clusterMembers: ["am1", "am2"],
    },
    {
      name: "am3",
      uri: "http://am3.example.com",
      publicURI: "http://am3.example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "am3",
      clusterMembers: ["am3"],
    },
  ],
  clusters: { HA: ["am1", "am2"], am3: ["am3"] },
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.data.setUpstreams(generateUpstreams());
  silenceFormStore = new SilenceFormStore();
});

const MountedAlertManagerInput = () => {
  return mount(
    <AlertManagerInput
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    },
  );
};

const ValidateSuggestions = () => {
  const tree = MountedAlertManagerInput();
  // clear all selected instances, they are selected by default
  const clear = tree.find("div.react-select__clear-indicator");
  // https://github.com/JedWatson/react-select/blob/a5f16df18502e6008730969427c6b61a5ffda56f/packages/react-select/src/__tests__/Select.test.tsx#L2722-L2725
  clear.simulate("mousedown", { button: 0 });
  // click on the react-select component doesn't seem to trigger options
  // rendering in tests, so change the input instead
  tree.find("input").simulate("change", { target: { value: "am" } });
  return tree;
};

describe("<AlertManagerInput />", () => {
  it("matches snapshot", () => {
    const tree = MountedAlertManagerInput();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't render ValidationError after passed validation", () => {
    const tree = MountedAlertManagerInput();
    silenceFormStore.data.setWasValidated(true);
    expect(toDiffableHtml(tree.html())).not.toMatch(/fa-circle-exclamation/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/Required/);
  });

  it("renders ValidationError after failed validation", () => {
    const tree = MountedAlertManagerInput();
    tree.find("div.react-select__multi-value__remove").at(0).simulate("click");
    tree.find("div.react-select__multi-value__remove").at(0).simulate("click");
    silenceFormStore.data.setAlertmanagers([]);
    silenceFormStore.data.setWasValidated(true);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-circle-exclamation/);
    expect(toDiffableHtml(tree.html())).toMatch(/Required/);
  });

  it("all available Alertmanager instances are selected by default", () => {
    MountedAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "Cluster: HA",
      value: ["am1", "am2"],
    });
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"],
    });
  });

  it("doesn't override last selected Alertmanager instances on mount", () => {
    silenceFormStore.data.setAlertmanagers([{ label: "am3", value: ["am3"] }]);
    MountedAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"],
    });
  });

  it("renders all 3 suggestions", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("Cluster: HA");
    expect(options.at(1).text()).toBe("am3");
  });

  it("clicking on options appends them to silenceFormStore.data.alertmanagers", () => {
    silenceFormStore.data.setAlertmanagers([]);
    const tree = ValidateSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "Cluster: HA",
      value: ["am1", "am2"],
    });
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"],
    });
  });

  it("silenceFormStore.data.alertmanagers gets updated from alertStore.data.upstreams.instances on mismatch", () => {
    MountedAlertManagerInput();
    alertStore.data.setClusters({
      amNew: ["amNew"],
    });
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "amNew",
      value: ["amNew"],
    });
  });

  it("is enabled when silenceFormStore.data.silenceID is null", () => {
    silenceFormStore.data.setSilenceID(null);
    const tree = MountedAlertManagerInput();
    const select = tree.find("SelectContainer");
    expect((select.props() as any).isDisabled).toBeFalsy();
  });

  it("is disabled when silenceFormStore.data.silenceID is not null", () => {
    silenceFormStore.data.setSilenceID("1234");
    const tree = MountedAlertManagerInput();
    const select = tree.find("SelectContainer");
    expect((select.props() as any).isDisabled).toBe(true);
  });

  it("removing last options sets silenceFormStore.data.alertmanagers to []", () => {
    const tree = MountedAlertManagerInput();
    expect(silenceFormStore.data.alertmanagers).toHaveLength(2);

    tree.find("div.react-select__multi-value__remove").at(0).simulate("click");
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);

    tree.find("div.react-select__multi-value__remove").simulate("click");
    expect(silenceFormStore.data.alertmanagers).toHaveLength(0);
    expect(silenceFormStore.data.alertmanagers).toEqual([]);
  });

  it("doesn't include readonly instances", () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].readonly = true;
    upstreams.instances[2].readonly = true;
    MountedAlertManagerInput();
    alertStore.data.setUpstreams(upstreams);
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am2",
      value: ["am2"],
    });
  });

  it("uses default alertmanagers to select the cluster", () => {
    const upstreams = generateUpstreams();
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{
        silenceForm: {
          strip: {
            labels: [],
          },
          defaultAlertmanagers: ["am2", "bob"],
        },
      },
    });
    MountedAlertManagerInput();
    alertStore.data.setUpstreams(upstreams);
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "Cluster: HA",
      value: ["am1", "am2"],
    });
  });

  it("uses default alertmanagers to select the instance", () => {
    const upstreams = generateUpstreams();
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{
        silenceForm: {
          strip: {
            labels: [],
          },
          defaultAlertmanagers: ["am0", "am3", "bob"],
        },
      },
    });
    MountedAlertManagerInput();
    alertStore.data.setUpstreams(upstreams);
    expect(silenceFormStore.data.alertmanagers).toHaveLength(1);
    expect(silenceFormStore.data.alertmanagers).toContainEqual({
      label: "am3",
      value: ["am3"],
    });
  });
});
