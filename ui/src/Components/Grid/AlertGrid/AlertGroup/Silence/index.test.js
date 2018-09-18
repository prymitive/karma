import React from "react";

import { toJS } from "mobx";
import { Provider } from "mobx-react";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import { AlertStore } from "Stores/AlertStore";
import { Silence, SilenceDetails } from ".";

const mockAfterUpdate = jest.fn();

const alertmanager = {
  name: "default",
  state: "suppressed",
  startsAt: "2000-01-01T10:00:00Z",
  endsAt: "0001-01-01T00:00:00Z",
  source: "localhost/prometheus",
  silencedBy: ["4cf5fd82-1edd-4169-99d1-ff8415e72179"]
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

beforeEach(() => {
  advanceTo(new Date(2000, 0, 1, 15, 0, 0));
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
        uri: "file:///mock",
        publicURI: "http://example.com",
        error: ""
      }
    ]
  };
  alertStore.data.silences = {
    default: {
      "4cf5fd82-1edd-4169-99d1-ff8415e72179": silence
    }
  };
});

afterEach(() => {
  // reset Date() to current time
  clear();
});

const MountedSilence = alertmanagerState => {
  return mount(
    <Provider alertStore={alertStore}>
      <Silence
        alertStore={alertStore}
        alertmanagerState={alertmanagerState}
        silenceID="4cf5fd82-1edd-4169-99d1-ff8415e72179"
        afterUpdate={mockAfterUpdate}
      />
    </Provider>
  );
};

const ShallowSilenceDetails = () => {
  return shallow(
    <SilenceDetails
      alertmanager={alertStore.data.upstreams.instances[0]}
      silence={silence}
    />
  );
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
    const toggle = tree.find("a.float-right.cursor-pointer");
    toggle.simulate("click");
    const details = tree.find("SilenceDetails");
    expect(details).toHaveLength(1);
  });

  it("matches snapshot with expaned details", () => {
    const tree = MountedSilence(alertmanager).find("Silence");
    tree.instance().collapse.toggle();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders comment as link when jiraURL is set", () => {
    alertStore.data.silences.default[silence.id].jiraURL =
      "http://jira.example.com";
    const tree = MountedSilence(alertmanager).find("Silence");
    const link = tree.find("a[href='http://jira.example.com']");
    expect(link).toHaveLength(1);
    expect(link.text()).toBe("Fake silence");
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
      uri: "file:///mock",
      publicURI: "http://example.com",
      error: ""
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
});

describe("<SilenceDetails />", () => {
  it("unexpired silence endsAt label uses 'secondary' class", () => {
    const tree = ShallowSilenceDetails();
    const endsAt = tree.find("span.badge").at(1);
    expect(endsAt.html()).toMatch(/badge-secondary/);
  });

  it("expired silence endsAt label uses 'danger' class", () => {
    advanceTo(new Date(2000, 0, 1, 23, 0, 0));
    const tree = ShallowSilenceDetails();
    const endsAt = tree.find("span.badge").at(1);
    expect(endsAt.html()).toMatch(/badge-danger/);
  });

  it("id links to Alertmanager silence view via alertmanager.uri", () => {
    const tree = ShallowSilenceDetails();
    const link = tree.find("a");
    expect(link.props().href).toBe(
      "file:///mock/#/silences/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });
});

describe("<SilenceExpiryBadgeWithProgress />", () => {
  it("renders with class 'danger' and no progressbar when expired", () => {
    advanceTo(new Date(2001, 0, 1, 23, 0, 0));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/badge-danger/);
    expect(tree.text()).toMatch(/Expired a year ago/);
  });

  it("progressbar uses class 'danger' when > 90%", () => {
    advanceTo(new Date(2000, 0, 1, 19, 30, 0));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/progress-bar bg-danger/);
  });

  it("progressbar uses class 'danger' when > 75%", () => {
    advanceTo(new Date(2000, 0, 1, 17, 45, 0));
    const tree = MountedSilence(alertmanager);
    expect(tree.html()).toMatch(/progress-bar bg-warning/);
  });

  it("calling calculate() on progress multiple times in a row doesn't change the value", () => {
    const startsAt = new Date(2000, 0, 1, 10, 0, 0);
    const endsAt = new Date(2000, 0, 1, 20, 0, 0);

    const tree = MountedSilence(alertmanager).find("Silence");
    const instance = tree.instance();

    const value = toJS(instance.progress.value);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    expect(toJS(instance.progress.value)).toBe(value);
  });
});
