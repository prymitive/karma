import React from "react";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { SilenceSubmitProgress } from "./SilenceSubmitProgress";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.data.upstreams = {
    instances: [
      {
        name: "mockAlertmanager",
        uri: "http://localhost",
        publicURI: "http://example.com",
        readonly: false,
        headers: { foo: "bar" },
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "mockAlertmanager",
        clusterMembers: ["mockAlertmanager"]
      }
    ]
  };

  fetch.resetMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
});

const MountedSilenceSubmitProgress = () => {
  return mount(
    <SilenceSubmitProgress
      cluster="mockAlertmanager"
      members={["mockAlertmanager"]}
      payload={{
        matchers: [],
        startsAt: "now",
        endsAt: "later",
        createdBy: "me@example.com",
        comment: "fake payload"
      }}
      alertStore={alertStore}
    />
  );
};

describe("<SilenceSubmitProgress />", () => {
  it("sends a request on mount", async () => {
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it("appends /api/v2/silences to the passed URI", async () => {
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    const uri = fetch.mock.calls[0][0];
    expect(uri).toBe("http://localhost/api/v2/silences");
  });

  it("sends correct JSON payload", () => {
    MountedSilenceSubmitProgress();
    const payload = fetch.mock.calls[0][1];
    expect(payload).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json", foo: "bar" },
      body: JSON.stringify({
        matchers: [],
        startsAt: "now",
        endsAt: "later",
        createdBy: "me@example.com",
        comment: "fake payload"
      })
    });
  });

  it("uses CORS credentials from alertmanager config", async () => {
    alertStore.data.upstreams.instances[0].corsCredentials = "same-origin";
    MountedSilenceSubmitProgress();
    expect(fetch.mock.calls[0][0]).toBe("http://localhost/api/v2/silences");
    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: "same-origin",
      method: "POST"
    });
  });

  it("will retry on another cluster member after fetch failure", async () => {
    fetch
      .mockRejectOnce(new Error("mock error message"))
      .mockResponseOnce(JSON.stringify({ silenceID: "123456789" }));
    alertStore.data.upstreams = {
      clusters: { ha: ["am1", "am2"] },
      instances: [
        {
          name: "am1",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"]
        },
        {
          name: "am2",
          uri: "http://am2.example.com",
          publicURI: "http://am2.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"]
        }
      ]
    };

    const tree = mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am1", "am2"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload"
        }}
        alertStore={alertStore}
      />
    );
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am2.example.com/api/v2/silences"
    );
    await expect(tree.instance().submitState.fetch).resolves.toBe("123456789");
    expect(fetch.mock.calls[1][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
  });

  it("will log an error if Alertmanager instance is missing from instances and try the next one", async () => {
    fetch.resetMocks();
    fetch.mockReject(new Error("mock error message"));
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    alertStore.data.upstreams = {
      clusters: { ha: ["am1", "am2"] },
      instances: [
        {
          name: "am1",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"]
        }
      ]
    };

    const tree = mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am1", "am2"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload"
        }}
        alertStore={alertStore}
      />
    );
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("will refuse to send requests to an alertmanager instance that is readonly", async () => {
    fetch.resetMocks();
    const logs = [];
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation((message, ...args) => {
        logs.push(message);
      });

    alertStore.data.upstreams = {
      clusters: { ha: ["am1", "am2"] },
      instances: [
        {
          name: "am1",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"]
        },
        {
          name: "am2",
          uri: "http://am2.example.com",
          publicURI: "http://am2.example.com",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"]
        }
      ]
    };

    const tree = mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am1", "am2"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload"
        }}
        alertStore={alertStore}
      />
    );
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
    expect(logs).toEqual(['Alertmanager instance "am2" is read-only']);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("renders returned silence ID on successful fetch", async () => {
    fetch.mockResponseOnce(JSON.stringify({ silenceID: "123456789" }));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("123456789");
    // force re-render
    tree.update();
    const silenceLink = tree.find("a");
    expect(silenceLink).toHaveLength(1);
    expect(silenceLink.text()).toBe("123456789");
  });

  it("renders returned error message on failed fetch", async () => {
    fetch.mockResponseOnce("mock error message", { status: 500 });
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe(
      "mock error message"
    );
    expect(tree.text()).toBe("mockAlertmanagermock error message");
  });

  it("renders success icon on successful fetch", async () => {
    fetch.mockResponseOnce(JSON.stringify({ silenceID: "123" }));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("123");
    tree.update();
    expect(tree.find("FontAwesomeIcon.text-success")).toHaveLength(1);
    expect(tree.find("FontAwesomeIcon.text-danger")).toHaveLength(0);
  });

  it("renders silence link on successful fetch", async () => {
    fetch.mockResponseOnce(JSON.stringify({ silenceID: "123" }));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("123");
    tree.update();
    expect(
      tree
        .find("a")
        .getDOMNode()
        .getAttribute("href")
    ).toBe("http://example.com/#/silences/123");
  });

  it("renders error icon on failed fetch", async () => {
    fetch.mockResponseOnce("error message", { status: 500 });
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe(
      "error message"
    );
    tree.update();
    expect(tree.find("FontAwesomeIcon.text-success")).toHaveLength(0);
    expect(tree.find("FontAwesomeIcon.text-danger")).toHaveLength(1);
  });
});
