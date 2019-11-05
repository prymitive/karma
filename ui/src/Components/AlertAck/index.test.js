import React from "react";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import { MockAlertGroup, MockAlert } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertAck } from ".";

let alertStore;
let silenceFormStore;
let alerts;
let group;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  alertStore.settings.values.alertAcknowledgement = {
    enabled: true,
    durationSeconds: 123,
    author: "default author",
    commentPrefix: "PREFIX"
  };
  alertStore.data.upstreams = {
    clusters: { default: ["default"] },
    instances: [
      {
        name: "default",
        uri: "http://localhost",
        publicURI: "http://example.com",
        headers: { foo: "bar" },
        error: "",
        version: "0.15.0",
        cluster: "default",
        clusterMembers: ["default"]
      }
    ]
  };

  alerts = [
    MockAlert([], { foo: "bar" }, "active"),
    MockAlert([], { foo: "baz" }, "suppressed")
  ];
  group = MockAlertGroup({ alertname: "Fake Alert" }, alerts, [], {}, {});
});

afterEach(() => {
  fetch.resetMocks();
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
  await expect(
    tree.instance().submitState.silencesByCluster["default"].fetch
  ).resolves.toBeUndefined();
};

describe("<AlertAck />", () => {
  it("is null when acks are disabled", () => {
    alertStore.settings.values.alertAcknowledgement.enabled = false;
    const tree = MountedAlertAck();
    expect(tree.html()).toBeNull();
  });

  it("uses faCheck icon when idle", () => {
    const tree = MountedAlertAck();
    expect(tree.html()).toMatch(/fa-check/);
  });

  it("uses faExclamationCircle after failed fetch", async () => {
    fetch.mockResponse("error message", { status: 500 });
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(tree.html()).toMatch(/fa-exclamation-circle/);
  });

  it("[v1] uses faCheckCircle after successful fetch", async () => {
    fetch.mockResponse(
      JSON.stringify({ status: "success", data: { silenceId: "123456789" } })
    );
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(tree.html()).toMatch(/fa-check-circle/);
  });

  it("[v2] uses faCheckCircle after successful fetch", async () => {
    fetch.mockResponse(JSON.stringify({ silenceID: "123" }));
    alertStore.data.upstreams.instances[0].version = "0.16.2";
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(tree.html()).toMatch(/fa-check-circle/);
  });

  it("sends a request on click", () => {
    MountAndClick();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it("doesn't send any request on click when already in progress", async () => {
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it("doesn't send any request on click when already done", async () => {
    const tree = MountedAlertAck();
    const button = tree.find("span.badge");

    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);

    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it("sends POST requests", () => {
    MountAndClick();
    expect(fetch.mock.calls[0][1].method).toBe("POST");
  });

  it("sends correct payload", () => {
    fetch.mockResponse(
      JSON.stringify({ status: "success", data: { silenceId: "123456789" } })
    );

    silenceFormStore.data.author = "karma/ui";
    MountAndClick();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      comment:
        "PREFIX This alert was acknowledged using karma on Tue Feb 01 2000 00:00:00 GMT+0000",
      createdBy: "karma/ui",
      endsAt: "2000-02-01T00:02:03.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" }
      ],
      startsAt: "2000-02-01T00:00:00.000Z"
    });
  });

  it("uses settings when generating payload", () => {
    alertStore.settings.values.alertAcknowledgement.durationSeconds = 237;
    alertStore.settings.values.alertAcknowledgement.author = "me";
    alertStore.settings.values.alertAcknowledgement.commentPrefix = "";
    MountAndClick();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      comment:
        "This alert was acknowledged using karma on Tue Feb 01 2000 00:00:00 GMT+0000",
      createdBy: "me",
      endsAt: "2000-02-01T00:03:57.000Z",
      matchers: [
        { isRegex: false, name: "alertname", value: "Fake Alert" },
        { isRegex: true, name: "foo", value: "(bar|baz)" }
      ],
      startsAt: "2000-02-01T00:00:00.000Z"
    });
  });

  it("[v1] sends POST request to /api/v1/silences", () => {
    MountAndClick();
    const uri = fetch.mock.calls[0][0];
    expect(uri).toBe("http://localhost/api/v1/silences");
  });

  it("[v2] sends POST request to /api/v2/silences", () => {
    alertStore.data.upstreams.instances[0].version = "0.16.2";
    MountAndClick();
    const uri = fetch.mock.calls[0][0];
    expect(uri).toBe("http://localhost/api/v2/silences");
  });

  it("[v1] will retry on another cluster member after fetch failure", async () => {
    fetch
      .mockResponseOnce(JSON.stringify({ status: "error" }))
      .mockResponseOnce(
        JSON.stringify({ status: "success", data: { silenceId: "123456789" } })
      );
    alertStore.data.upstreams = {
      clusters: { default: ["default", "fallback"] },
      instances: [
        {
          name: "default",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          headers: {},
          error: "",
          version: "0.15.0",
          cluster: "default",
          clusterMembers: ["default", "fallback"]
        },
        {
          name: "fallback",
          uri: "http://am2.example.com",
          publicURI: "http://am2.example.com",
          headers: {},
          error: "",
          version: "0.15.0",
          cluster: "default",
          clusterMembers: ["default", "fallback"]
        }
      ]
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am2.example.com/api/v1/silences"
    );
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe(
      "http://am1.example.com/api/v1/silences"
    );
  });

  it("[v2] will retry on another cluster member after fetch failure", async () => {
    fetch
      .mockResponseOnce("error message", { status: 500 })
      .mockResponseOnce(JSON.stringify({ silenceID: "123" }));
    alertStore.data.upstreams = {
      clusters: { default: ["default", "fallback"] },
      instances: [
        {
          name: "default",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          headers: {},
          error: "",
          version: "0.16.2",
          cluster: "default",
          clusterMembers: ["default", "fallback"]
        },
        {
          name: "fallback",
          uri: "http://am2.example.com",
          publicURI: "http://am2.example.com",
          headers: {},
          error: "",
          version: "0.16.2",
          cluster: "default",
          clusterMembers: ["default", "fallback"]
        }
      ]
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am2.example.com/api/v2/silences"
    );
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe(
      "http://am1.example.com/api/v2/silences"
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
          headers: {},
          error: "",
          version: "0.15.0",
          cluster: "default",
          clusterMembers: ["default", "fallback"]
        }
      ]
    };

    const tree = MountedAlertAck();
    const button = tree.find("span.badge");
    button.simulate("click");
    await expect(
      tree.instance().submitState.silencesByCluster["default"].fetch
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am1.example.com/api/v1/silences"
    );
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
