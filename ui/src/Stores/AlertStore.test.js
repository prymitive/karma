import {
  AlertStore,
  AlertStoreStatuses,
  FormatUnseeBackendURI,
  DecodeLocationSearch
} from "Stores/AlertStore";

describe("AlertStore.status", () => {
  it("status is initially idle with no error", () => {
    const store = new AlertStore([]);
    expect(store.status.value).toEqual(AlertStoreStatuses.Idle);
    expect(store.status.error).toBeNull();
  });

  it("status is InProgress with no error after setInProgress", () => {
    const store = new AlertStore([]);
    store.status.setInProgress();
    expect(store.status.value).toEqual(AlertStoreStatuses.InProgress);
    expect(store.status.error).toBeNull();
  });

  it("status is Failure with correct error after setFailure", () => {
    const store = new AlertStore([]);
    store.status.setFailure("my error");
    expect(store.status.value).toEqual(AlertStoreStatuses.Failure);
    expect(store.status.error).toEqual("my error");
  });

  it("status is Idle with no error after setInProgress and setIdle", () => {
    const store = new AlertStore([]);
    store.status.setInProgress();
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
  const formatEmptyFilter = raw => ({
    applied: false,
    isValid: true,
    raw: raw,
    hits: 0,
    name: "",
    matcher: "",
    value: ""
  });

  it("addFilter('foo') should create a correct empty filter", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(formatEmptyFilter("foo"));
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
    expect(store.filters.values[0]).toMatchObject(formatEmptyFilter("bar"));
    expect(store.filters.values[1]).toMatchObject(formatEmptyFilter("baz"));
  });

  it("removeFilter('foo') should not remove any filter if 'foo' isn't defined", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("bar");
    store.filters.removeFilter("foo");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(formatEmptyFilter("bar"));
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
    expect(store.filters.values[0]).toMatchObject(formatEmptyFilter("bar"));
    expect(store.filters.values[1]).toMatchObject(formatEmptyFilter("new"));
    expect(store.filters.values[2]).toMatchObject(formatEmptyFilter("baz"));
  });

  it("replaceFilter('foo', 'bar') should not allow duplicates", () => {
    const store = new AlertStore([]);
    store.filters.addFilter("foo");
    store.filters.addFilter("bar");
    store.filters.replaceFilter("foo", "bar");
    expect(store.filters.values).toHaveLength(1);
    expect(store.filters.values[0]).toMatchObject(formatEmptyFilter("bar"));
  });
});

describe("FormatUnseeBackendURI", () => {
  beforeEach(() => {
    // wipe REACT_APP_BACKEND_URI env on each run as it's used by some tests
    delete process.env.REACT_APP_BACKEND_URI;
  });

  it("FormatUnseeBackendURI without REACT_APP_BACKEND_URI env returns ./ prefixed URIs", () => {
    const uri = FormatUnseeBackendURI("foo/bar");
    expect(uri).toEqual("./foo/bar");
  });

  it("FormatUnseeBackendURI with REACT_APP_BACKEND_URI env returns env value prefixed URIs", () => {
    process.env.REACT_APP_BACKEND_URI = "http://localhost:1234";
    const uri = FormatUnseeBackendURI("foo/bar");
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
