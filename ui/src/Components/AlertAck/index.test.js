import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import fetchMock from "fetch-mock";

import { MockAlertGroup, MockAlert } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertAck } from ".";

let alertStore;
let silenceFormStore;
let alerts;
let group;

beforeEach(() => {
  jest.useFakeTimers();
  advanceTo(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  alertStore.settings.values.alertAcknowledgement = {
    enabled: true,
    durationSeconds: 123,
    author: "default author",
    commentPrefix: "PREFIX",
  };
  alertStore.data.upstreams = {
    clusters: { default: ["default"] },
    instances: [
      {
        name: "default",
        uri: "http://localhost",
        publicURI: "http://example.com",
        readonly: false,
        headers: { foo: "bar" },
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "default",
        clusterMembers: ["default"],
      },
    ],
  };

  alerts = [
    MockAlert([], { foo: "bar" }, "active"),
    MockAlert([], { foo: "baz" }, "active"),
    MockAlert([], { foo: "ignore" }, "suppressed"),
  ];
  group = MockAlertGroup({ alertname: "Fake Alert" }, alerts, [], {}, {});

  fetchMock.resetHistory();
  fetchMock.any(
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123" }),
    },
    {
      overwriteRoutes: true,
    }
  );
});

afterEach(() => {
  fetchMock.resetHistory();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clear();
});

const MountedAlertAck = () => {
  return mount(
    <AlertAck
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      group={group}
    />
  );
};

const MountAndClick = async () => {
  const tree = MountedAlertAck();
  const button = tree.find("span.badge");
  button.simulate("click");
  await act(async () => {
    await fetchMock.flush(true);
  });
};

describe("<AlertAck />", () => {
  it("is null when acks are disabled", () => {
    alertStore.settings.values.alertAcknowledgement.enabled = false;
    const tree = MountedAlertAck();
    expect(tree.html()).toBeNull();
  });

  it("uses faCheck icon when idle", () => {
    const tree = MountedAlertAck();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-check/);
  });

  it("uses faExclamationCircle after failed fetch", async () => {
    fetchMock.any(
      {
        status: 500,
        body: "error message",
      },
      {
        overwriteRoutes: true,
      }
    );
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(toDiffableHtml(tree.html())).toMatch(/fa-exclamation-circle/);
  });

  it("resets faExclamationCircle after 20s", async () => {
    fetchMock.any(
      {
        status: 500,
        body: "error message",
      },
      {
        overwriteRoutes: true,
      }
    );
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(toDiffableHtml(tree.html())).toMatch(/fa-exclamation-circle/);

    act(() => jest.advanceTimersByTime(21 * 1000));
    tree.update();
    expect(toDiffableHtml(tree.html())).not.toMatch(/fa-exclamation-circle/);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-check/);
  });

  it("uses faCheckCircle after successful fetch", async () => {
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(toDiffableHtml(tree.html())).toMatch(/fa-check-circle/);
  });

  it("sends a POST request on click", async () => {
    await MountAndClick();
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastCall()[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("sends a POST request to every cluster", async () => {
    alertStore.data.upstreams = {
      clusters: { c1: ["m1", "m2"], c2: ["m3", "m4"] },
      instances: ["m1", "m2", "m3", "m4"].map((a) => ({
        name: a,
        uri: `http://${a}.example.com`,
        publicURI: `http://${a}.example.com`,
        readonly: false,
        headers: { "X-Cluster": a === "m1" || a === "2" ? "c1" : "c2" },
        corsCredentials: a === "m1" || a === "2" ? "same-site" : "include",
        error: "",
        version: "0.17.0",
        cluster: a === "m1" || a === "2" ? "c1" : "c2",
        clusterMembers: a === "m1" || a === "2" ? ["m1", "m2"] : ["m3", "m4"],
      })),
    };
    group.alertmanagerCount = {
      m1: 1,
      m2: 1,
      m3: 1,
      m4: 1,
    };

    await MountAndClick();
    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://m1.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[0][1]).toMatchObject({
      method: "POST",
      credentials: "same-site",
      headers: { "X-Cluster": "c1" },
    });
    expect(fetchMock.calls()[1][0]).toBe(
      "http://m3.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: { "X-Cluster": "c2" },
    });
  });

  it("skips readonly alertmanagers", async () => {
    alertStore.data.upstreams = {
      clusters: { c1: ["m1", "m2"], c2: ["m3", "m4"] },
      instances: ["m1", "m2", "m3", "m4"].map((a) => ({
        name: a,
        uri: `http://${a}.example.com`,
        publicURI: `http://${a}.example.com`,
        readonly: a === "m1" || a === "m3" ? true : false,
        headers: { "X-Cluster": a === "m1" || a === "2" ? "c1" : "c2" },
        corsCredentials: a === "m1" || a === "m2" ? "same-site" : "include",
        error: "",
        version: "0.17.0",
        cluster: a === "m1" || a === "2" ? "c1" : "c2",
        clusterMembers: a === "m1" || a === "2" ? ["m1", "m2"] : ["m3", "m4"],
      })),
    };
    group.alertmanagerCount = {
      m1: 1,
      m2: 1,
      m3: 1,
      m4: 1,
    };

    await MountAndClick();
    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://m2.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[1][0]).toBe(
      "http://m4.example.com/api/v2/silences"
    );
  });

  it("doesn't send any request on click when already done", async () => {
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");

    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(1);

    button.simulate("click");
    expect(fetchMock.calls()).toHaveLength(1);
  });

  it("sends correct payload", async () => {
    fetchMock.any(
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ silenceID: "123456789" }),
      },
      {
        overwriteRoutes: true,
      }
    );

    silenceFormStore.data.author = "karma/ui";
    await MountAndClick();
    expect(JSON.parse(fetchMock.calls()[0][1].body)).toEqual({
      comment:
        "PREFIX This alert was acknowledged using karma on Tue, 01 Feb 2000 00:00:00 GMT",
      createdBy: "karma/ui",
      endsAt: "2000-02-01T00:02:03.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" },
      ],
      startsAt: "2000-02-01T00:00:00.000Z",
    });
  });

  it("uses settings when generating payload", async () => {
    alertStore.settings.values.alertAcknowledgement.durationSeconds = 237;
    alertStore.settings.values.alertAcknowledgement.author = "me";
    alertStore.settings.values.alertAcknowledgement.commentPrefix = "";
    await MountAndClick();
    expect(JSON.parse(fetchMock.calls()[0][1].body)).toEqual({
      comment:
        "This alert was acknowledged using karma on Tue, 01 Feb 2000 00:00:00 GMT",
      createdBy: "me",
      endsAt: "2000-02-01T00:03:57.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" },
      ],
      startsAt: "2000-02-01T00:00:00.000Z",
    });
  });

  it("uses author from authentication info when auth is enabled", async () => {
    alertStore.info.authentication.enabled = true;
    alertStore.info.authentication.username = "auth@example.com";
    alertStore.settings.values.alertAcknowledgement.durationSeconds = 222;
    alertStore.settings.values.alertAcknowledgement.author = "me";
    alertStore.settings.values.alertAcknowledgement.commentPrefix = "FOO:";
    await MountAndClick();
    expect(JSON.parse(fetchMock.calls()[0][1].body)).toEqual({
      comment:
        "FOO: This alert was acknowledged using karma on Tue, 01 Feb 2000 00:00:00 GMT",
      createdBy: "auth@example.com",
      endsAt: "2000-02-01T00:03:42.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" },
      ],
      startsAt: "2000-02-01T00:00:00.000Z",
    });
  });

  it("uses author from silenceFormStore if authentication is disabled", async () => {
    alertStore.info.authentication.enabled = false;
    alertStore.info.authentication.username = "wrong";
    alertStore.settings.values.alertAcknowledgement.durationSeconds = 222;
    alertStore.settings.values.alertAcknowledgement.author = "me";
    alertStore.settings.values.alertAcknowledgement.commentPrefix = "FOO:";
    silenceFormStore.data.author = "bob@example.com";
    await MountAndClick();
    expect(JSON.parse(fetchMock.calls()[0][1].body)).toEqual({
      comment:
        "FOO: This alert was acknowledged using karma on Tue, 01 Feb 2000 00:00:00 GMT",
      createdBy: "bob@example.com",
      endsAt: "2000-02-01T00:03:42.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" },
      ],
      startsAt: "2000-02-01T00:00:00.000Z",
    });
  });

  it("uses default author as fallback", async () => {
    alertStore.settings.values.alertAcknowledgement.durationSeconds = 222;
    alertStore.settings.values.alertAcknowledgement.author = "me";
    alertStore.settings.values.alertAcknowledgement.commentPrefix = "FOO:";
    silenceFormStore.data.author = "";
    await MountAndClick();
    expect(JSON.parse(fetchMock.calls()[0][1].body)).toEqual({
      comment:
        "FOO: This alert was acknowledged using karma on Tue, 01 Feb 2000 00:00:00 GMT",
      createdBy: "me",
      endsAt: "2000-02-01T00:03:42.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" },
      ],
      startsAt: "2000-02-01T00:00:00.000Z",
    });
  });

  it("sends POST request to /api/v2/silences", async () => {
    await MountAndClick();
    const uri = fetchMock.calls()[0][0];
    expect(uri).toBe("http://localhost/api/v2/silences");
  });

  it("will retry on another cluster member after 500 response", async () => {
    fetchMock.reset();
    fetchMock.mock("http://m1.example.com/api/v2/silences", {
      status: 500,
      body: "error message",
    });
    fetchMock.mock("http://m2.example.com/api/v2/silences", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123" }),
    });
    fetchMock.mock("http://m3.example.com/api/v2/silences", {
      status: 500,
      body: "error message",
    });
    fetchMock.mock("http://m4.example.com/api/v2/silences", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "456" }),
    });
    alertStore.data.upstreams = {
      clusters: { c1: ["m1", "m2"], c2: ["m3", "m4"] },
      instances: ["m1", "m2", "m3", "m4"].map((a) => ({
        name: a,
        uri: `http://${a}.example.com`,
        publicURI: `http://${a}.example.com`,
        readonly: false,
        headers: { "X-Cluster": a === "m1" || a === "2" ? "c1" : "c2" },
        corsCredentials: a === "m1" || a === "m2" ? "same-site" : "include",
        error: "",
        version: "0.17.0",
        cluster: a === "m1" || a === "2" ? "c1" : "c2",
        clusterMembers: a === "m1" || a === "2" ? ["m1", "m2"] : ["m3", "m4"],
      })),
    };
    group.alertmanagerCount = {
      m1: 1,
      m2: 1,
      m3: 1,
      m4: 1,
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(4);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://m1.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[1][0]).toBe(
      "http://m2.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[2][0]).toBe(
      "http://m3.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[3][0]).toBe(
      "http://m4.example.com/api/v2/silences"
    );
  });

  it("will retry on another cluster member after fetch failure", async () => {
    fetchMock.reset();
    fetchMock.mock("http://m1.example.com/api/v2/silences", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.mock("http://m2.example.com/api/v2/silences", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123" }),
    });
    fetchMock.mock("http://m3.example.com/api/v2/silences", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.mock("http://m4.example.com/api/v2/silences", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123" }),
    });
    alertStore.data.upstreams = {
      clusters: { c1: ["m1", "m2"], c2: ["m3", "m4"] },
      instances: ["m1", "m2", "m3", "m4"].map((a) => ({
        name: a,
        uri: `http://${a}.example.com`,
        publicURI: `http://${a}.example.com`,
        readonly: false,
        headers: { "X-Cluster": a === "m1" || a === "2" ? "c1" : "c2" },
        corsCredentials: a === "m1" || a === "m2" ? "same-site" : "include",
        error: "",
        version: "0.17.0",
        cluster: a === "m1" || a === "2" ? "c1" : "c2",
        clusterMembers: a === "m1" || a === "2" ? ["m1", "m2"] : ["m3", "m4"],
      })),
    };
    group.alertmanagerCount = {
      m1: 1,
      m2: 1,
      m3: 1,
      m4: 1,
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(4);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://m1.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[1][0]).toBe(
      "http://m2.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[2][0]).toBe(
      "http://m3.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()[3][0]).toBe(
      "http://m4.example.com/api/v2/silences"
    );
  });

  it("will log an error if Alertmanager instance is missing from instances and try the next one", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    alertStore.data.upstreams = {
      clusters: { default: ["default", "fallback"] },
      instances: [
        {
          name: "default",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["default", "fallback"],
        },
      ],
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
