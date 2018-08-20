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
