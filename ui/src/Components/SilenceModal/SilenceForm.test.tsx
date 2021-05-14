import { mount } from "enzyme";

import copy from "copy-to-clipboard";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore, NewEmptyMatcher } from "Stores/SilenceFormStore";
import { QueryOperators, StaticLabels } from "Common/Query";
import { ThemeContext } from "Components/Theme";
import SilenceForm from "./SilenceForm";
import { APIAlertsResponseUpstreamsT } from "Models/APITypes";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;

const generateUpstreams = (
  version = "0.22.0"
): APIAlertsResponseUpstreamsT => ({
  counters: {
    healthy: 1,
    failed: 0,
    total: 1,
  },
  instances: [
    {
      name: "am1",
      uri: "http://am1.example.com",
      publicURI: "http://am1.example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: version,
      cluster: "am1",
      clusterMembers: ["am1"],
    },
  ],
  clusters: {
    am1: ["am1"],
  },
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();
  alertStore.data.setUpstreams(generateUpstreams());
});

const MountedSilenceForm = () => {
  return mount(
    <SilenceForm
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      previewOpen={false}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<SilenceForm /> matchers", () => {
  it("has an empty matcher selects on default render", () => {
    const tree = MountedSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(1);
    expect(silenceFormStore.data.matchers).toHaveLength(1);
  });

  it("uses filters to populate default matchers when silenceFormStore.data.autofillMatchers=true", () => {
    const filter = (name: string, matcher: string, value: string) => {
      const f = NewUnappliedFilter(`${name}${matcher}${value}`);
      f.name = name;
      f.matcher = matcher;
      f.value = value;
      return f;
    };

    const filterCombos = (name: string) =>
      Object.entries(QueryOperators).map(([k, v]) =>
        filter(name, v, `${name}${k}`)
      );

    alertStore.filters.setFilterValues([
      ...filterCombos(StaticLabels.AlertName),
      ...filterCombos(StaticLabels.AlertManager),
      ...filterCombos(StaticLabels.Receiver),
      ...filterCombos(StaticLabels.State),
      ...filterCombos(StaticLabels.SilenceID),
      ...filterCombos("cluster"),
      ...filterCombos("foo"),
    ]);
    silenceFormStore.data.setAutofillMatchers(true);
    const tree = MountedSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(12);
    expect(silenceFormStore.data.matchers).toHaveLength(12);
    expect(silenceFormStore.data.matchers).toEqual([
      {
        id: "2",
        isRegex: false,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: "alertnameEqual",
            value: "alertnameEqual",
          },
        ],
      },
      {
        id: "3",
        isRegex: false,
        isEqual: false,
        name: "alertname",
        values: [
          {
            label: "alertnameNotEqual",
            value: "alertnameNotEqual",
          },
        ],
      },
      {
        id: "4",
        isRegex: true,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: ".*alertnameRegex.*",
            value: ".*alertnameRegex.*",
          },
        ],
      },
      {
        id: "5",
        isRegex: true,
        isEqual: false,
        name: "alertname",
        values: [
          {
            label: ".*alertnameNegativeRegex.*",
            value: ".*alertnameNegativeRegex.*",
          },
        ],
      },
      {
        id: "6",
        isRegex: false,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: "clusterEqual",
            value: "clusterEqual",
          },
        ],
      },
      {
        id: "7",
        isRegex: false,
        isEqual: false,
        name: "cluster",
        values: [
          {
            label: "clusterNotEqual",
            value: "clusterNotEqual",
          },
        ],
      },
      {
        id: "8",
        isRegex: true,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: ".*clusterRegex.*",
            value: ".*clusterRegex.*",
          },
        ],
      },
      {
        id: "9",
        isRegex: true,
        isEqual: false,
        name: "cluster",
        values: [
          {
            label: ".*clusterNegativeRegex.*",
            value: ".*clusterNegativeRegex.*",
          },
        ],
      },
      {
        id: "10",
        isRegex: false,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: "fooEqual",
            value: "fooEqual",
          },
        ],
      },
      {
        id: "11",
        isRegex: false,
        isEqual: false,
        name: "foo",
        values: [
          {
            label: "fooNotEqual",
            value: "fooNotEqual",
          },
        ],
      },
      {
        id: "12",
        isRegex: true,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: ".*fooRegex.*",
            value: ".*fooRegex.*",
          },
        ],
      },
      {
        id: "13",
        isRegex: true,
        isEqual: false,
        name: "foo",
        values: [
          {
            label: ".*fooNegativeRegex.*",
            value: ".*fooNegativeRegex.*",
          },
        ],
      },
    ]);
  });

  it("correctly populates filters when enableIsEqual=false", () => {
    alertStore.data.setUpstreams(generateUpstreams("0.17.0"));

    const filter = (name: string, matcher: string, value: string) => {
      const f = NewUnappliedFilter(`${name}${matcher}${value}`);
      f.name = name;
      f.matcher = matcher;
      f.value = value;
      return f;
    };

    const filterCombos = (name: string) =>
      Object.entries(QueryOperators).map(([k, v]) =>
        filter(name, v, `${name}${k}`)
      );

    alertStore.filters.setFilterValues([
      ...filterCombos(StaticLabels.AlertName),
      ...filterCombos(StaticLabels.AlertManager),
      ...filterCombos(StaticLabels.Receiver),
      ...filterCombos(StaticLabels.State),
      ...filterCombos(StaticLabels.SilenceID),
      ...filterCombos("cluster"),
      ...filterCombos("foo"),
    ]);
    silenceFormStore.data.setAutofillMatchers(true);
    const tree = MountedSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(12);
    expect(silenceFormStore.data.matchers).toHaveLength(12);
    expect(silenceFormStore.data.matchers).toEqual([
      {
        id: "14",
        isRegex: false,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: "alertnameEqual",
            value: "alertnameEqual",
          },
        ],
      },
      {
        id: "15",
        isRegex: false,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: "alertnameNotEqual",
            value: "alertnameNotEqual",
          },
        ],
      },
      {
        id: "16",
        isRegex: true,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: ".*alertnameRegex.*",
            value: ".*alertnameRegex.*",
          },
        ],
      },
      {
        id: "17",
        isRegex: true,
        isEqual: true,
        name: "alertname",
        values: [
          {
            label: ".*alertnameNegativeRegex.*",
            value: ".*alertnameNegativeRegex.*",
          },
        ],
      },
      {
        id: "18",
        isRegex: false,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: "clusterEqual",
            value: "clusterEqual",
          },
        ],
      },
      {
        id: "19",
        isRegex: false,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: "clusterNotEqual",
            value: "clusterNotEqual",
          },
        ],
      },
      {
        id: "20",
        isRegex: true,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: ".*clusterRegex.*",
            value: ".*clusterRegex.*",
          },
        ],
      },
      {
        id: "21",
        isRegex: true,
        isEqual: true,
        name: "cluster",
        values: [
          {
            label: ".*clusterNegativeRegex.*",
            value: ".*clusterNegativeRegex.*",
          },
        ],
      },
      {
        id: "22",
        isRegex: false,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: "fooEqual",
            value: "fooEqual",
          },
        ],
      },
      {
        id: "23",
        isRegex: false,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: "fooNotEqual",
            value: "fooNotEqual",
          },
        ],
      },
      {
        id: "24",
        isRegex: true,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: ".*fooRegex.*",
            value: ".*fooRegex.*",
          },
        ],
      },
      {
        id: "25",
        isRegex: true,
        isEqual: true,
        name: "foo",
        values: [
          {
            label: ".*fooNegativeRegex.*",
            value: ".*fooNegativeRegex.*",
          },
        ],
      },
    ]);
  });

  it("doesn't use filters to populate default matchers when silenceFormStore.data.autofillMatchers=false", () => {
    const filter = (name: string, matcher: string, value: string) => {
      const f = NewUnappliedFilter(`${name}${matcher}${value}`);
      f.name = name;
      f.matcher = matcher;
      f.value = value;
      return f;
    };

    const filterCombos = (name: string) =>
      Object.entries(QueryOperators).map(([k, v]) =>
        filter(name, v, `${name}${k}`)
      );

    alertStore.filters.setFilterValues([
      ...filterCombos(StaticLabels.AlertName),
      ...filterCombos(StaticLabels.AlertManager),
      ...filterCombos(StaticLabels.Receiver),
      ...filterCombos(StaticLabels.State),
      ...filterCombos(StaticLabels.SilenceID),
      ...filterCombos("cluster"),
      ...filterCombos("foo"),
    ]);
    silenceFormStore.data.setAutofillMatchers(false);
    const tree = MountedSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(1);
    expect(silenceFormStore.data.matchers[0]).toMatchObject({
      isRegex: false,
      name: "",
      values: [],
    });
  });

  it("clicking 'Add more' button adds another matcher", () => {
    const tree = MountedSilenceForm();
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
    silenceFormStore.data.setAutofillMatchers(false);
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    const tree = MountedSilenceForm();
    expect(silenceFormStore.data.matchers).toHaveLength(2);

    const matcher = tree.find("SilenceMatch");
    const button = matcher.find("button");
    expect(button).toHaveLength(2);
  });

  it("clicking trash icon on a matcher select removes it", () => {
    silenceFormStore.data.setAutofillMatchers(false);
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
  it("doesn't render PayloadPreview by default", () => {
    const tree = MountedSilenceForm();
    expect(tree.find("PayloadPreview")).toHaveLength(0);
  });

  it("renders PayloadPreview after clicking the toggle", () => {
    const tree = MountedSilenceForm();
    tree.find("span.badge.cursor-pointer.text-muted").simulate("click");
    expect(tree.find("PayloadPreview")).toHaveLength(1);
  });

  it("clicking on the toggle icon toggles PayloadPreview", () => {
    const tree = MountedSilenceForm();
    const button = tree.find(".badge.cursor-pointer.text-muted");
    expect(tree.find("PayloadPreview")).toHaveLength(0);
    button.simulate("click");
    expect(tree.find("PayloadPreview")).toHaveLength(1);
    button.simulate("click");
    expect(tree.find("PayloadPreview")).toHaveLength(0);
  });

  it("clicking on the copy button copies form link to the clipboard", () => {
    const matcher = NewEmptyMatcher();
    matcher.name = "job";
    matcher.values = [{ label: "node_exporter", value: "node_exporter" }];
    silenceFormStore.data.setMatchers([matcher]);
    silenceFormStore.data.setAlertmanagers([{ label: "am1", value: ["am1"] }]);
    silenceFormStore.data.setAuthor("me@example.com");
    silenceFormStore.data.setComment("fake silence");
    silenceFormStore.data.setAutofillMatchers(false);

    const tree = MountedSilenceForm();
    tree.find(".badge.cursor-pointer.text-muted").simulate("click");

    const button = tree.find("span.input-group-text.cursor-pointer");
    expect(button.html()).toMatch(/fa-copy/);
    button.simulate("click");
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("silence form share link doesn't change on new input", () => {
    const matcher = NewEmptyMatcher();
    matcher.name = "job";
    matcher.values = [{ label: "node_exporter", value: "node_exporter" }];
    silenceFormStore.data.setMatchers([matcher]);
    silenceFormStore.data.setAlertmanagers([{ label: "am1", value: ["am1"] }]);
    silenceFormStore.data.setAuthor("me@example.com");
    silenceFormStore.data.setComment("fake silence");
    silenceFormStore.data.setAutofillMatchers(false);

    const tree = MountedSilenceForm();
    tree.find(".badge.cursor-pointer.text-muted").simulate("click");

    const input = tree.find("input.form-control").at(2);
    expect(input.props().value).toMatch(/http:\/\/localhost\/\?m=/);
    const link = input.props().value;

    input.simulate("change", { target: { value: "a" } });
    expect(input.props().value).toBe(link);
  });
});

describe("<SilenceForm /> inputs", () => {
  it("author is read-only when info.authentication.enabled is true", () => {
    alertStore.info.setAuthentication(true, "auth@example.com");
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.props().readOnly).toBe(true);
    expect(input.props().value).toBe("auth@example.com");
    expect(silenceFormStore.data.author).toBe("auth@example.com");
  });

  it("default author value comes from Settings store", () => {
    settingsStore.silenceFormConfig.saveAuthor("foo@example.com");
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author']");
    expect(input.props().value).toBe("foo@example.com");
    expect(silenceFormStore.data.author).toBe("foo@example.com");
  });

  it("default author value is empty if nothing is stored in Settings", () => {
    settingsStore.silenceFormConfig.saveAuthor("");
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
    const tree = MountedSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(silenceFormStore.data.currentStage).toBe("form");
  });

  it("calling submit move form to the 'Preview' stage when form is valid", () => {
    const matcher = NewEmptyMatcher();
    matcher.name = "job";
    matcher.values = [{ label: "node_exporter", value: "node_exporter" }];
    silenceFormStore.data.setMatchers([matcher]);
    silenceFormStore.data.setAlertmanagers([{ label: "am1", value: ["am1"] }]);
    silenceFormStore.data.setAuthor("me@example.com");
    silenceFormStore.data.setComment("fake silence");
    silenceFormStore.data.setAutofillMatchers(false);
    const tree = MountedSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(silenceFormStore.data.currentStage).toBe("preview");
  });

  it("calling submit saves author value to the Settings store", () => {
    silenceFormStore.data.setAuthor("user@example.com");
    const tree = MountedSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(settingsStore.silenceFormConfig.config.author).toBe(
      "user@example.com"
    );
  });
});

describe("<SilenceForm /> in edit mode", () => {
  it("opening form with silenceID set disables AlertManagerInput", () => {
    silenceFormStore.data.setSilenceID("12345");
    const tree = MountedSilenceForm();
    const select = tree.find("StateManager").at(0);
    expect((select.props() as any).isDisabled).toBe(true);
  });

  it("opening form with silenceID shows reset button", () => {
    silenceFormStore.data.setSilenceID("12345");
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-danger");
    expect(button).toHaveLength(1);
  });

  it("clicking on Reset button unsets silenceFormStore.data.silenceID", () => {
    silenceFormStore.data.setSilenceID("12345");
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-danger");
    button.simulate("click");
    expect(silenceFormStore.data.silenceID).toBeNull();
  });

  it("clicking on Reset button hides it", () => {
    silenceFormStore.data.setSilenceID("12345");
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-danger");
    button.simulate("click");
    expect(tree.find("button.btn-danger")).toHaveLength(0);
  });

  it("clicking on Reset button enables AlertManagerInput", () => {
    silenceFormStore.data.setSilenceID("12345");
    const tree = MountedSilenceForm();
    const button = tree.find("button.btn-danger");
    button.simulate("click");
    const select = tree.find("StateManager").at(0);
    expect((select.props() as any).isDisabled).toBeFalsy();
  });
});
