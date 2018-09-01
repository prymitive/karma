import React from "react";

import { Provider } from "mobx-react";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import { AlertStore } from "Stores/AlertStore";
import { Silence, SilenceDetails, SilenceExpiryBadgeWithProgress } from ".";

const mockAfterUpdate = jest.fn();

const alertmanager = {
  name: "default",
  uri: "file:///mock",
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

const MountedSilence = () => {
  return mount(
    <Provider alertStore={alertStore}>
      <Silence
        alertStore={alertStore}
        alertmanager={alertmanager}
        silenceID="4cf5fd82-1edd-4169-99d1-ff8415e72179"
        afterUpdate={mockAfterUpdate}
      />
    </Provider>
  );
};

describe("<Silence />", () => {
  it("matches snapshot when data is present in alertStore", () => {
    const tree = MountedSilence().find("Silence");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders full silence when data is present in alertStore", () => {
    const tree = MountedSilence().find("Silence");
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(0);
  });

  it("matches snapshot when data is not present in alertStore", () => {
    alertStore.data.silences = {};
    const tree = MountedSilence().find("Silence");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders FallbackSilenceDesciption when Alertmanager data is not present in alertStore", () => {
    alertStore.data.silences = {};
    const tree = MountedSilence();
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(1);
    expect(tree.text()).toBe(
      "Silenced by default/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });

  it("renders FallbackSilenceDesciption when silence data is not present in alertStore", () => {
    alertStore.data.silences.default = {};
    const tree = MountedSilence();
    const fallback = tree.find("FallbackSilenceDesciption");
    expect(fallback).toHaveLength(1);
    expect(tree.text()).toBe(
      "Silenced by default/4cf5fd82-1edd-4169-99d1-ff8415e72179"
    );
  });

  it("clicking on expand toggle shows silence details", () => {
    const tree = MountedSilence();
    const toggle = tree.find("a.float-right.cursor-pointer");
    toggle.simulate("click");
    const details = tree.find("SilenceDetails");
    expect(details).toHaveLength(1);
  });

  it("matches snapshot with expaned details", () => {
    const tree = MountedSilence().find("Silence");
    tree.instance().collapse.toggle();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders comment as link when jiraURL is set", () => {
    alertStore.data.silences.default[silence.id].jiraURL =
      "http://jira.example.com";
    const tree = MountedSilence().find("Silence");
    const link = tree.find("a[href='http://jira.example.com']");
    expect(link).toHaveLength(1);
    expect(link.text()).toBe("Fake silence");
  });
});

const ShallowSilenceDetails = () => {
  return shallow(
    <SilenceDetails alertmanager={alertmanager} silence={silence} />
  );
};

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
});

const ShallowSilenceExpiryBadgeWithProgress = () => {
  return shallow(<SilenceExpiryBadgeWithProgress silence={silence} />);
};

describe("<SilenceExpiryBadgeWithProgress />", () => {
  it("renders with class 'danger' and no progressbar when expired", () => {
    advanceTo(new Date(2001, 0, 1, 23, 0, 0));
    const tree = ShallowSilenceExpiryBadgeWithProgress();
    expect(tree.html()).toMatch(/badge-danger/);
    expect(tree.text()).toBe("Expired <t />");
  });

  it("progressbar uses class 'danger' when > 90%", () => {
    advanceTo(new Date(2000, 0, 1, 19, 30, 0));
    const tree = ShallowSilenceExpiryBadgeWithProgress();
    expect(tree.html()).toMatch(/progress-bar bg-danger/);
  });

  it("progressbar uses class 'danger' when > 75%", () => {
    advanceTo(new Date(2000, 0, 1, 17, 45, 0));
    const tree = ShallowSilenceExpiryBadgeWithProgress();
    expect(tree.html()).toMatch(/progress-bar bg-warning/);
  });
});
