import fetchMock from "fetch-mock";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import {
  AlertStore,
  AlertStoreStatuses,
  FormatBackendURI,
  FormatAlertsQ,
  DecodeLocationSearch,
  UpdateLocationSearch,
  NewUnappliedFilter,
} from "Stores/AlertStore";

beforeEach(() => {
  fetchMock.reset();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.reset();
  // wipe REACT_APP_BACKEND_URI env on each run as it's used by some tests
  delete process.env.REACT_APP_BACKEND_URI;
});

describe("AlertStore.data", () => {
  it("getClusterAlertmanagersWithoutReadOnly filters out readonly instances", () => {
    const store = new AlertStore([]);
    store.data.upstreams = {
      clusters: { default: ["default", "readonly"] },
      instances: [
        {
          name: "default",
          uri: "http://localhost",
          publicURI: "http://example.com:8080",
          readonly: false,
          headers: { foo: "bar" },
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["default", "readonly"],
        },
        {
          name: "readonly",
          uri: "http://localhost:8081",
          publicURI: "http://example.com",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["default", "readonly"],
        },
      ],
    };
    expect(
      store.data.getClusterAlertmanagersWithoutReadOnly("default")
    ).toEqual(["default"]);
  });
});

describe("AlertStore.data", () => {
  it("getClusterAlertmanagersWithoutReadOnly handles clusters with no writable instances", () => {
    const store = new AlertStore([]);
    store.data.upstreams = {
      clusters: { default: ["ro1", "ro2"] },
      instances: [
        {
          name: "ro1",
          uri: "http://localhost",
          publicURI: "http://example.com:8080",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["ro1", "ro2"],
        },
        {
          name: "ro2",
          uri: "http://localhost:8081",
          publicURI: "http://example.com",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["ro1", "ro2"],
        },
      ],
    };
    expect(
      store.data.getClusterAlertmanagersWithoutReadOnly("default")
    ).toEqual([]);
  });
});

describe("AlertStore.status", () => {
  it("status is initially idle with no error", () => {
    const store = new AlertStore([]);
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.status.error).toBeNull();
  });

  it("status is Fetching with no error after setFetching()", () => {
    const store = new AlertStore([]);
    store.status.setFetching();
    expect(store.status.value).toEqual(AlertStoreStatuses.Fetching);
    expect(store.status.error).toBeNull();
  });

  it("status is Processing with no error after setProcessing()", () => {
    const store = new AlertStore([]);
    store.status.setProcessing();
    expect(store.status.value).toEqual(AlertStoreStatuses.Processing);
    expect(store.status.error).toBeNull();
  });

  it("status is Failure with correct error after setFailure", () => {
    const store = new AlertStore([]);
    store.status.setFailure("my error");
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.status.error).toEqual("my error");
  });

  it("status is Idle with no error after setFetching and setIdle", () => {
    const store = new AlertStore([]);
    store.status.setFetching();
    store.status.setIdle();
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.status.error).toBeNull();
  });

  it("status is Idle with no error after setFailure and setIdle", () => {
    const store = new AlertStore([]);
    store.status.setFailure("foo");
    store.status.setIdle();
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.status.error).toBeNull();
  });
});

describe("AlertStore.filters", () => {
  it("addFilter('foo') should create a correct empty filter", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("foo"));
  });

  it("addFilter should not allow duplicates", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    store.filters.addFilter("foo");
    expect(store.filters.values).toHaveLength(1);
  });

  it("removeFilter('foo') should remove passed filter if it's defined", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    store.filters.removeFilter("foo");
    expect(store.filters.values).toHaveLength(0);
  });

  it("removeFilter('foo') should not remove filters other than 'foo'", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("bar");
    store.filters.addFilter("foo");
    store.filters.addFilter("baz");
    store.filters.removeFilter("foo");
    expect(store.filters.values).toHaveLength(2);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("bar"));
    expect(store.filters.values[1]).toMatchObject(NewUnappliedFilter("baz"));
  });

  it("removeFilter('foo') should not remove any filter if 'foo' isn't defined", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("bar");
    store.filters.removeFilter("foo");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("bar"));
  });

  it("replaceFilter('foo', 'bar') should not replace anything if filter list is empty", () => {
    const store = new AlertStore([]);
    store.filters.replaceFilter("foo", "bar");
    expect(store.filters.values).toHaveLength(0);
  });

  it("replaceFilter('foo', 'new') should replace correct filter", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("bar");
    store.filters.addFilter("foo");
    store.filters.addFilter("baz");
    store.filters.replaceFilter("foo", "new");
    expect(store.filters.values).toHaveLength(3);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("bar"));
    expect(store.filters.values[1]).toMatchObject(NewUnappliedFilter("new"));
    expect(store.filters.values[2]).toMatchObject(NewUnappliedFilter("baz"));
  });

  it("replaceFilter('foo', 'bar') should not allow duplicates", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    store.filters.addFilter("bar");
    store.filters.replaceFilter("foo", "bar");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("bar"));
  });

  it("addFilter() updates window.history", () => {
    const store = new AlertStore([]);
    const historyMock = jest.spyOn(global.window.history, "pushState");
    store.filters.addFilter("foo");
    expect(historyMock).toHaveBeenLastCalledWith(
      null,
      null,
      "http://localhost/?q=foo"
    );
  });

  it("replaceFilter() updates window.history", () => {
    const store = new AlertStore(["foo"]);
    const historyMock = jest.spyOn(global.window.history, "pushState");
    store.filters.replaceFilter("foo", "bar");
    expect(historyMock).toHaveBeenLastCalledWith(
      null,
      null,
      "http://localhost/?q=bar"
    );
  });

  it("addFilter() updates window.history", () => {
    const store = new AlertStore([]);
    const historyMock = jest.spyOn(global.window.history, "pushState");
    store.filters.addFilter("foo");
    expect(historyMock).toHaveBeenLastCalledWith(
      null,
      null,
      "http://localhost/?q=foo"
    );
  });

  it("setFilters() updates window.history", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    store.filters.addFilter("bar");

    const historyMock = jest.spyOn(global.window.history, "pushState");
    store.filters.setFilters(["baz", "far"]);
    expect(store.filters.values).toHaveLength(2);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("baz"));
    expect(store.filters.values[1]).toMatchObject(NewUnappliedFilter("far"));
    expect(historyMock).toHaveBeenLastCalledWith(
      null,
      null,
      "http://localhost/?q=baz&q=far"
    );
  });

  it("setWithoutLocation() doesn't update window.history", () => {
    const store = new AlertStore(["far", "foo"]);

    const historyMock = jest.spyOn(global.window.history, "pushState");
    store.filters.setWithoutLocation(["baz", "far"]);
    expect(store.filters.values).toHaveLength(2);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("baz"));
    expect(store.filters.values[1]).toMatchObject(NewUnappliedFilter("far"));
    expect(historyMock).not.toHaveBeenCalled();
  });

  it("setWithoutLocation() adds missing filters", () => {
    const store = new AlertStore([]);
    store.filters.setWithoutLocation(["foo", "bar"]);
    expect(store.filters.values).toHaveLength(2);
    expect(store.filters.values[0]).toMatchObject(NewUnappliedFilter("foo"));
    expect(store.filters.values[1]).toMatchObject(NewUnappliedFilter("bar"));
  });

  it("setWithoutLocation() removes orphaned filters", () => {
    const store = new AlertStore(["far"]);
    store.filters.setWithoutLocation([]);
    expect(store.filters.values).toHaveLength(0);
  });
});

describe("FormatBackendURI", () => {
  it("FormatBackendURI without REACT_APP_BACKEND_URI env returns ./ prefixed URIs", () => {
    const uri = FormatBackendURI("foo/bar");
    expect(uri).toEqual("./foo/bar");
  });

  it("FormatBackendURI with REACT_APP_BACKEND_URI env returns env value prefixed URIs", () => {
    process.env.REACT_APP_BACKEND_URI = "http://localhost:1234";
    const uri = FormatBackendURI("foo/bar");
    expect(uri).toEqual("http://localhost:1234/foo/bar");
  });
});

describe("FormatAlertsQ", () => {
  it("encodes multiple values without indices", () => {
    expect(FormatAlertsQ(["a", "b"])).toBe("q=a&q=b");
  });
});

describe("DecodeLocationSearch", () => {
  const defaultParams = {
    defaultsUsed: true,
    params: { q: [] },
  };

  it("empty ('') search param is decoded correctly", () => {
    expect(DecodeLocationSearch("")).toMatchObject(defaultParams);
  });

  it("empty ('?') search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?")).toMatchObject(defaultParams);
  });

  it("no value q[]= search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=")).toMatchObject({
      defaultsUsed: false,
      params: { q: [] },
    });
  });

  it("no value q= search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q=")).toMatchObject({
      defaultsUsed: false,
      params: { q: [] },
    });
  });

  it("no value q[]=&q[]= search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q=")).toMatchObject({
      defaultsUsed: false,
      params: { q: [] },
    });
  });

  it("single value q=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo"] },
    });
  });

  it("single value q[]=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo"] },
    });
  });

  it("multi value q[]=foo&q[]=bar search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo&q[]=bar")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo", "bar"] },
    });
  });

  it("multi value q[]=foo&q[]=bar&q[]=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo&q[]=bar&q[]=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo", "bar"] },
    });
  });

  it("multi value q[]=foo&q[]=&q[]=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo&q[]=&q[]=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo"] },
    });
  });
});

describe("UpdateLocationSearch", () => {
  it("{q: foo} is pushed to location.search", () => {
    UpdateLocationSearch({ q: "foo" });
    expect(window.location.search).toBe("?q=foo");
  });

  it("{a: foo} is not pushed to location.search", () => {
    UpdateLocationSearch({ a: "foo" });
    expect(window.location.search).toBe("?q=");
  });

  it("{a: foo, q: bar} is pushed to location.search", () => {
    UpdateLocationSearch({ a: "foo", q: "bar" });
    expect(window.location.search).toBe("?q=bar");
  });

  it("{q: [1, 2]} is pushed to location.search", () => {
    UpdateLocationSearch({ q: ["1", "2"] });
    expect(window.location.search).toBe("?q=1&q=2");
  });
});

describe("AlertStore.fetch", () => {
  it("parseAPIResponse() rejects a response with mismatched filters", () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    const response = EmptyAPIResponse();
    const store = new AlertStore([]);
    store.parseAPIResponse(response);

    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    // there should be no filters set on AlertStore instance since we started
    // with 0 and rejected response with 1 filter
    expect(store.filters.values).toHaveLength(0);
    // console.info should have been called since we emited a log line
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("parseAPIResponse() works for a single filter 'label=value'", () => {
    const response = EmptyAPIResponse();

    const store = new AlertStore(["label=value"]);
    store.parseAPIResponse(response);

    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.info.version).toBe("fakeVersion");
    expect(store.filters.values[0].applied).toBe(true);
  });

  it("fetch() works with valid response", async () => {
    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });

    const store = new AlertStore(["label=value"]);
    await expect(store.fetch()).resolves.toBeUndefined();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.info.version).toBe("fakeVersion");
  });

  it("fetch() handles response with error correctly", async () => {
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify({ error: "Fetch error" }),
    });

    const store = new AlertStore([]);
    await expect(store.fetch()).resolves.toBeUndefined();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.info.version).toBe("unknown");
  });

  it("fetch() handles response that throws an error correctly", async () => {
    const consoleSpy = jest
      .spyOn(console, "trace")
      .mockImplementation(() => {});
    fetchMock.reset();
    fetchMock.any({
      throws: new Error("fetch error"),
    });

    const store = new AlertStore([]);
    await expect(store.fetch()).resolves.toHaveProperty("error");

    expect(fetchMock.calls()).toHaveLength(10);
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.info.version).toBe("unknown");
    // there should be a trace of the error
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("fetch() retries on failure", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    const store = new AlertStore([]);

    fetchMock.reset();
    fetchMock.any({
      throws: new Error("fetch error"),
    });

    await expect(store.fetch()).resolves.toHaveProperty("error");
    expect(fetchMock.calls()).toHaveLength(10);
  });

  it("fetch() retry counter is reset after successful fetch", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    const store = new AlertStore(["label=value"]);

    fetchMock.reset();
    fetchMock.any({
      throws: new Error("fetch error"),
    });

    await expect(store.fetch()).resolves.toHaveProperty("error");
    expect(fetchMock.calls()).toHaveLength(10);

    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });

    await expect(store.fetch()).resolves.toBeUndefined();
    expect(fetchMock.calls()).toHaveLength(1);

    fetchMock.reset();
    fetchMock.any({
      throws: new Error("fetch error"),
    });

    await expect(store.fetch()).resolves.toHaveProperty("error");
    expect(fetchMock.calls()).toHaveLength(10);
  });

  it("fetch() reloads the page after if auth middleware is detected", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});

    const store = new AlertStore(["label=value"]);

    jest.spyOn(global, "fetch").mockImplementation(async () =>
      Promise.resolve({
        type: "opaque",
        body: "auth needed",
        json: jest.fn(() => EmptyAPIResponse()),
      })
    );

    await expect(store.fetch()).resolves.toBeUndefined();

    expect(store.info.reloadNeeded).toBe(true);
  });

  it("unapplied filters are marked as applied on fetch error", async () => {
    const store = new AlertStore([NewUnappliedFilter("foo")]);
    store.filters.values[0].applied = false;

    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetchMock.reset();
    fetchMock.any({
      throws: new Error("fetch error"),
    });

    await expect(store.fetch()).resolves.toHaveProperty("error");
    expect(store.filters.values[0].applied).toBe(true);
  });

  it("stored settings are updated if needed after fetch", async () => {
    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });

    const store = new AlertStore(["label=value"]);

    // initial fetch, should update settings
    store.settings.values = { foo: "bar" };
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.settings.values).toMatchObject({
      staticColorLabels: ["job"],
      annotationsDefaultHidden: false,
      annotationsHidden: [],
      annotationsVisible: [],
    });

    // second fetch, should keep same settings
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.settings.values).toMatchObject({
      staticColorLabels: ["job"],
      annotationsDefaultHidden: false,
      annotationsHidden: [],
      annotationsVisible: [],
    });
  });

  it("wants to reload page after new version is returned in the API", async () => {
    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });
    const store = new AlertStore(["label=value"]);
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.info.upgradeNeeded).toBe(false);

    response.version = "newFakeVersion";
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.info.upgradeNeeded).toBe(true);
  });

  it("adds new groups to the store after fetch", () => {
    const response = EmptyAPIResponse();
    response.grids = [
      {
        labelName: "",
        labelValue: "",
        alertGroups: { foo: "foo", bar: "bar" },
      },
    ];
    const store = new AlertStore(["label=value"]);
    store.parseAPIResponse(response);
    expect(store.data.grids).toHaveLength(1);
    expect(Object.keys(store.data.grids[0].alertGroups)).toHaveLength(2);
    expect(store.data.grids[0].alertGroups).toMatchObject({
      foo: "foo",
      bar: "bar",
    });
  });

  it("removes old groups from the store after fetch", () => {
    const store = new AlertStore(["label=value"]);
    store.data.grids = [
      {
        labelName: "",
        labelValue: "",
        alertGroups: { foo: "foo", delete: "me", bar: "bar" },
      },
    ];
    expect(store.data.grids).toHaveLength(1);
    expect(Object.keys(store.data.grids[0].alertGroups)).toHaveLength(3);

    const response = EmptyAPIResponse();
    response.grids = [
      {
        labelName: "",
        labelValue: "",
        alertGroups: { foo: "foo", bar: "bar" },
      },
    ];

    store.parseAPIResponse(response);
    expect(Object.keys(store.data.grids[0].alertGroups)).toHaveLength(2);
    expect(store.data.grids[0].alertGroups).toMatchObject({
      foo: "foo",
      bar: "bar",
    });
  });

  it("uses correct query args with gridSortReverse=false", async () => {
    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });
    const store = new AlertStore(["label=value"]);
    await expect(
      store.fetch("", false, "sortOrder", "sortLabel", "sortReverse")
    ).resolves.toBeUndefined();
    expect(fetchMock.calls().length).toEqual(1);
    expect(fetchMock.calls()[0][0]).toBe(
      "/alerts.json?&gridLabel=&gridSortReverse=0&sortOrder=sortOrder&sortLabel=sortLabel&sortReverse=sortReverse&q=label%3Dvalue"
    );
  });

  it("uses correct query args with gridSortReverse=true", async () => {
    const response = EmptyAPIResponse();
    fetchMock.reset();
    fetchMock.any({
      body: JSON.stringify(response),
    });
    const store = new AlertStore(["label=value"]);
    await expect(
      store.fetch("cluster", true, "sortOrder", "sortLabel", "sortReverse")
    ).resolves.toBeUndefined();
    expect(fetchMock.calls().length).toEqual(1);
    expect(fetchMock.calls()[0][0]).toBe(
      "/alerts.json?&gridLabel=cluster&gridSortReverse=1&sortOrder=sortOrder&sortLabel=sortLabel&sortReverse=sortReverse&q=label%3Dvalue"
    );
  });
});
