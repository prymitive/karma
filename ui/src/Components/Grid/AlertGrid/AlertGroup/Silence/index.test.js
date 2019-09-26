import React from "react";

import { toJS } from "mobx";
import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Silence, SilenceDetails } from ".";

const mockAfterUpdate = jest.fn();

const alertmanager = {
  name: "default",
  cluster: "default",
  state: "suppressed",
  startsAt: "2000-01-01T10:00:00Z",
  source: "localhost/prometheus",
  silencedBy: ["4cf5fd82-1edd-4169-99d1-ff8415e72179"],
  inhibitedBy: []
};

const silence = {
  id: "4cf5fd82-1edd-4169-99d1-ff8415e72179",
  matchers: [
    {
      name: "alertname",
      value: "MockAlert",
      isRegex: false
    },
    {
      name: "instance",
      value: "foo[0-9]+",
      isRegex: true
    }
  ],
  startsAt: "2000-01-01T10:00:00Z",
  endsAt: "2000-01-01T20:00:00Z",
  createdAt: "0001-01-01T00:00:00Z",
  createdBy: "me@example.com",
  comment: "Fake silence",
  jiraID: "",
  jiraURL: ""
};

let alertStore;
let silenceFormStore;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 15, 0, 0]));
  alertStore = new AlertStore([]);
  alertStore.data.upstreams = {
    counters: {
      total: 1,
      healthy: 1,
      failed: 0
    },
    instances: [
      {
        name: "default",
        cluster: "default",
        uri: "file:///mock",
        publicURI: "http://example.com",
        headers: {},
        error: "",
        version: "0.15.0",
        clusterMembers: ["default"]
      }
    ],
    clusters: { default: ["default"] }
  };
  alertStore.data.silences = {
    default: {
      "4cf5fd82-1edd-4169-99d1-ff8415e72179": silence
    }
  };
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  jest.restoreAllMocks();
  // reset Date() to current time
  clear();
});

const MountedSilence = alertmanagerState => {
  return mount(
    <Provider alertStore={alertStore}>
      <Silence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        alertmanagerState={alertmanagerState}
        silenceID="4cf5fd82-1edd-4169-99d1-ff8415e72179"
        afterUpdate={mockAfterUpdate}
      />
    </Provider>
  );
};

const MountedSilenceDetails = onEditSilence => {
  return mount(
    <Provider alertStore={alertStore}>
      <SilenceDetails
        alertStore={alertStore}
        alertmanager={alertStore.data.upstreams.instances[0]}
        silence={silence}
        onEditSilence={onEditSilence}
      />
    </Provider>
  ).find("SilenceDetails");
};

describe("<Silence />", () => {
  it("matches snapshot when data is present in alertStore", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders full silence when data is present in alertStore", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(0);
  });

  it("matches snapshot when data is not present in alertStore", () => {
    alertStore.data.silences = {};
    const tree = MountedSilence(alertmanager).find("Silence");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders FallbackSilenceDesciption when Alertmanager data is not present in alertStore", () => {
    alertStore.data.silences = {};
    const tree = MountedSilence(alertmanager);
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(1);
    expect(tree.text()).toBe(
      "Silenced by default/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });

  it("renders FallbackSilenceDesciption when silence data is not present in alertStore", () => {
    alertStore.data.silences.default = {};
    const tree = MountedSilence(alertmanager);
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(1);
    expect(tree.text()).toBe(
      "Silenced by default/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });

  it("clicking on expand toggle shows silence details", () => {
    const tree = MountedSilence(alertmanager);
    const toggle = tree.find(".float-right.cursor-pointer");
    toggle.simulate("click");
    const details = tree.find("SilenceDetails");
    expect(details).toHaveLength(1);
  });

  it("matches snapshot with expaned details", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    tree.instance().collapse.toggle();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders comment as link when jiraURL is set and silence is collapsed", () => {
    alertStore.data.silences.default[silence.id].jiraURL =
      "http://jira.example.com";
    const tree = MountedSilence(alertmanager).find("Silence");
    const link = tree.find("a[href='http://jira.example.com']");
    expect(link).toHaveLength(1);
    expect(link.text()).toBe("Fake silence…");
  });

  it("renders comment as link when jiraURL is set and silence is expaned", () => {
    alertStore.data.silences.default[silence.id].jiraURL =
      "http://jira.example.com";
    const tree = MountedSilence(alertmanager).find("Silence");
    tree.instance().collapse.toggle();
    const link = tree.find("a[href='http://jira.example.com']");
    expect(link).toHaveLength(1);
    expect(link.text()).toBe("Fake silence…");
  });

  it("clears progress timer on unmount", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    const instance = tree.instance();
    expect(instance.progressTimer).toBeTruthy();
    instance.componentWillUnmount();
    expect(instance.progressTimer).toBeNull();
  });

  it("getAlertmanager() returns alertmanager object from alertStore.data.upstreams.instances", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    const instance = tree.instance();
    const am = instance.getAlertmanager();
    expect(am).toEqual({
      name: "default",
      cluster: "default",
      uri: "file:///mock",
      publicURI: "http://example.com",
      headers: {},
      error: "",
      version: "0.15.0",
      clusterMembers: ["default"]
    });
  });

  it("getAlertmanager() return object with only name if given name is not in alertStore", () => {
    const missingAlertmanager = { ...alertmanager, name: "notDefault" };
    const tree = MountedSilence(missingAlertmanager).find("Silence");
    const instance = tree.instance();
    const am = instance.getAlertmanager();
    expect(am).toEqual({
      name: "notDefault"
    });
  });

  it("clicking on silence edit button calls silenceFormStore.data.fillFormFromSilence", () => {
    const fillSpy = jest.spyOn(silenceFormStore.data, "fillFormFromSilence");
    const tree = MountedSilence(alertmanager);

    // expand silence
    tree.find(".float-right.cursor-pointer").simulate("click");

    const button = tree.find(".badge-secondary.components-label-with-hover");
    expect(button.text()).toBe("Edit");
    button.simulate("click");
    expect(fillSpy).toHaveBeenCalled();
  });

  it("clicking on silence edit button opens the silence form", () => {
    const tree = MountedSilence(alertmanager);

    // expand silence
    tree.find(".float-right.cursor-pointer").simulate("click");

    const button = tree.find(".badge-secondary.components-label-with-hover");
    expect(button.text()).toBe("Edit");
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(true);
  });
});

describe("<SilenceDetails />", () => {
  it("unexpired silence endsAt label doesn't use 'danger' class", () => {
    const tree = MountedSilenceDetails(jest.fn());
    const endsAt = tree.find("span.badge").at(1);
    expect(endsAt.html()).not.toMatch(/text-danger/);
  });

  it("expired silence endsAt label uses 'danger' class", () => {
    advanceTo(moment.utc([2000, 0, 1, 23, 0, 0]));
    const tree = MountedSilenceDetails(jest.fn());
    const endsAt = tree.find("span.badge").at(2);
    expect(endsAt.html()).toMatch(/text-danger/);
  });

  it("id links to Alertmanager silence view via alertmanager.uri", () => {
    const tree = MountedSilenceDetails(jest.fn());
    const link = tree.find("a");
    expect(link.props().href).toBe(
      "file:///mock/#/silences/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });
});

describe("<SilenceExpiryBadgeWithProgress />", () => {
  it("renders with class 'danger' and no progressbar when expired", () => {
    advanceTo(moment.utc([2001, 0, 1, 23, 0, 0]));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/badge-danger/);
    expect(tree.text()).toMatch(/Expired a year ago/);
  });

  it("progressbar uses class 'danger' when > 90%", () => {
    advanceTo(moment.utc([2000, 0, 1, 19, 30, 0]));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/progress-bar bg-danger/);
  });

  it("progressbar uses class 'danger' when > 75%", () => {
    advanceTo(moment.utc([2000, 0, 1, 17, 45, 0]));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/progress-bar bg-warning/);
  });

  it("calling calculate() on progress multiple times in a row doesn't change the value", () => {
    const startsAt = moment.utc([2000, 0, 1, 10, 0, 0]);
    const endsAt = moment.utc([2000, 0, 1, 20, 0, 0]);

    const tree = MountedSilence(alertmanager).find("Silence");
    const instance = tree.instance();

    const value = toJS(instance.progress.value);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    expect(toJS(instance.progress.value)).toBe(value);
  });
});
