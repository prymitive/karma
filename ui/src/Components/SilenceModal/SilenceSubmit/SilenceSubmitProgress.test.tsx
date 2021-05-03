import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, NewClusterRequest } from "Stores/SilenceFormStore";
import { SilenceSubmitProgress } from "./SilenceSubmitProgress";
import { APIAlertsResponseUpstreamsT } from "Models/APITypes";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 1, healthy: 1, failed: 0 },
  clusters: { mockAlertmanager: ["mockAlertmanager"] },
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
      clusterMembers: ["mockAlertmanager"],
    },
  ],
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  alertStore.data.setUpstreams(generateUpstreams());

  silenceFormStore.data.setRequestsByCluster({
    mockAlertmanager: NewClusterRequest("mockAlertmanager", [
      "mockAlertmanager",
    ]),
  });

  fetchMock.resetHistory();
  fetchMock.mock(
    "*",
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123456789" }),
    },
    {
      overwriteRoutes: true,
    }
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.resetHistory();
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
        comment: "fake payload",
      }}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<SilenceSubmitProgress />", () => {
  it("sends a request on mount", async () => {
    MountedSilenceSubmitProgress();
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(1);
  });

  it("appends /api/v2/silences to the passed URI", async () => {
    MountedSilenceSubmitProgress();
    await act(async () => {
      await fetchMock.flush(true);
    });
    const uri = fetchMock.calls()[0][0];
    expect(uri).toBe("http://localhost/api/v2/silences");
  });

  it("sends correct JSON payload", async () => {
    MountedSilenceSubmitProgress();
    await act(async () => {
      await fetchMock.flush(true);
    });
    const payload = fetchMock.calls()[0][1];
    expect(payload).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json", foo: "bar" },
      body: JSON.stringify({
        matchers: [],
        startsAt: "now",
        endsAt: "later",
        createdBy: "me@example.com",
        comment: "fake payload",
      }),
    });
  });

  it("uses CORS credentials from alertmanager config", async () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].corsCredentials = "same-origin";
    alertStore.data.setUpstreams(upstreams);
    MountedSilenceSubmitProgress();
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()[0][0]).toBe("http://localhost/api/v2/silences");
    expect(fetchMock.calls()[0][1]).toMatchObject({
      credentials: "same-origin",
      method: "POST",
    });
  });

  it("will retry on another cluster member after fetch failure", async () => {
    fetchMock.reset();
    fetchMock.mock("http://am2.example.com/api/v2/silences", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.mock("http://am1.example.com/api/v2/silences", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ silenceID: "123456789" }),
    });
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 1, failed: 0 },
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
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"],
        },
      ],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()[0][0]).toBe(
      "http://am2.example.com/api/v2/silences"
    );
    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[1][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
  });

  it("will use error message from last failed cluster member", async () => {
    fetchMock.reset();
    fetchMock.mock("http://am2.example.com/api/v2/silences", {
      throws: new TypeError("failed to fetch from am2"),
    });
    fetchMock.mock("http://am1.example.com/api/v2/silences", {
      throws: new TypeError("failed to fetch from am1"),
    });
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
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
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"],
        },
      ],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    const tree = mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    tree.update();
    expect(fetchMock.calls()).toHaveLength(2);
    expect(silenceFormStore.data.requestsByCluster.ha).toMatchObject({
      isDone: true,
      error: "failed to fetch from am1",
    });
  });

  it("will log an error if Alertmanager instance is missing from instances and try the next one", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
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
          clusterMembers: ["am1", "am2"],
        },
      ],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    expect(fetchMock.calls()[0][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("will log an error if all members are missing from instances", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { ha: ["am1", "am2"] },
      instances: [],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    expect(fetchMock.calls()).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it("will refuse to send requests to an alertmanager instance that is readonly", async () => {
    const logs: string[] = [];
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation((message, ..._) => {
        logs.push(message);
      });

    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
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
          clusterMembers: ["am1", "am2"],
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
          clusterMembers: ["am1", "am2"],
        },
      ],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://am1.example.com/api/v2/silences"
    );
    expect(logs).toEqual(['Alertmanager instance "am2" is read-only']);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("will log an error if all members are readonly", async () => {
    const logs: string[] = [];
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation((message, ..._) => {
        logs.push(message);
      });

    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { ha: ["am1", "am2"] },
      instances: [
        {
          name: "am1",
          uri: "http://am1.example.com",
          publicURI: "http://am1.example.com",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "ha",
          clusterMembers: ["am1", "am2"],
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
          clusterMembers: ["am1", "am2"],
        },
      ],
    });
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    mount(
      <SilenceSubmitProgress
        cluster="ha"
        members={["am2", "am1"]}
        payload={{
          matchers: [],
          startsAt: "now",
          endsAt: "later",
          createdBy: "me@example.com",
          comment: "fake payload",
        }}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(fetchMock.calls()).toHaveLength(0);
    expect(logs).toEqual([
      'Alertmanager instance "am2" is read-only',
      'Alertmanager instance "am1" is read-only',
    ]);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it("renders silence link on successful fetch", async () => {
    const tree = MountedSilenceSubmitProgress();
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    tree.update();
    expect(
      silenceFormStore.data.requestsByCluster.mockAlertmanager
    ).toMatchObject({
      isDone: true,
      error: null,
      silenceID: "123456789",
      silenceLink: "http://example.com/#/silences/123456789",
    });
  });

  it("sets error icon on failed fetch", async () => {
    fetchMock.reset();
    fetchMock.mock("*", {
      status: 500,
      body: "error message",
    });
    const tree = MountedSilenceSubmitProgress();
    await act(async () => {
      await act(async () => {
        await fetchMock.flush(true);
      });
    });
    tree.update();
    expect(
      silenceFormStore.data.requestsByCluster.mockAlertmanager
    ).toMatchObject({
      isDone: true,
      error: "error message",
    });
  });
});
