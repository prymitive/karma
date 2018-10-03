import { EmptyAPIResponse } from "__mocks__/Fetch";

import {
  AlertStore,
  AlertStoreStatuses,
  FormatBackendURI,
  DecodeLocationSearch,
  UpdateLocationSearch,
  NewUnappliedFilter
} from "Stores/AlertStore";

beforeEach(() => {
  fetch.resetMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  // wipe REACT_APP_BACKEND_URI env on each run as it's used by some tests
  delete process.env.REACT_APP_BACKEND_URI;
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

describe("DecodeLocationSearch", () => {
  const defaultParams = {
    defaultsUsed: true,
    params: { q: [] }
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
      params: { q: [] }
    });
  });

  it("no value q= search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q=")).toMatchObject({
      defaultsUsed: false,
      params: { q: [] }
    });
  });

  it("single value q=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo"] }
    });
  });

  it("single value q[]=foo search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo"] }
    });
  });

  it("multi value q[]=foo&q[]=bar search param is decoded correctly", () => {
    expect(DecodeLocationSearch("?q[]=foo&q[]=bar")).toMatchObject({
      defaultsUsed: false,
      params: { q: ["foo", "bar"] }
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
    expect(window.location.search).toBe("");
  });

  it("{a: foo, q: bar} is pushed to location.search", () => {
    UpdateLocationSearch({ a: "foo", q: "bar" });
    expect(window.location.search).toBe("?q=bar");
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
    fetch.mockResponse(JSON.stringify(response));

    const store = new AlertStore(["label=value"]);
    await expect(store.fetch()).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.info.version).toBe("fakeVersion");
  });

  it("fetch() handles response with error correctly", async () => {
    fetch.mockResponse(JSON.stringify({ error: "Fetch error" }));

    const store = new AlertStore([]);
    await expect(store.fetch()).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.info.version).toBe("unknown");
  });

  it("fetch() handles response that throws an error correctly", async () => {
    const consoleSpy = jest
      .spyOn(console, "trace")
      .mockImplementation(() => {});
    fetch.mockReject("Fetch error");

    const store = new AlertStore([]);
    await expect(store.fetch()).resolves.toHaveProperty("error");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.info.version).toBe("unknown");
    // there should be a trace of the error
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("unapplied filters are marked as applied on fetch error", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.mockReject("Fetch error");
    const store = new AlertStore([NewUnappliedFilter("foo")]);
    store.filters.values[0].applied = false;
    await expect(store.fetch()).resolves.toHaveProperty("error");
    expect(store.filters.values[0].applied).toBe(true);
  });

  it("stored settings are updated if needed after fetch", async () => {
    const response = EmptyAPIResponse();
    fetch.mockResponse(JSON.stringify(response));

    const store = new AlertStore(["label=value"]);

    // initial fetch, should update settings
    store.settings.values = { foo: "bar" };
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.settings.values).toMatchObject({
      staticColorLabels: ["job"],
      annotationsDefaultHidden: false,
      annotationsHidden: [],
      annotationsVisible: []
    });

    // second fetch, should keep same settings
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.settings.values).toMatchObject({
      staticColorLabels: ["job"],
      annotationsDefaultHidden: false,
      annotationsHidden: [],
      annotationsVisible: []
    });
  });

  it("wants to reload page after new version is returned in the API", async () => {
    const response = EmptyAPIResponse();
    fetch.mockResponse(JSON.stringify(response));
    const store = new AlertStore(["label=value"]);
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.info.upgradeNeeded).toBe(false);

    response.version = "newFakeVersion";
    fetch.mockResponse(JSON.stringify(response));
    await expect(store.fetch()).resolves.toBeUndefined();
    expect(store.info.upgradeNeeded).toBe(true);
  });
});
