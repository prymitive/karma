import { act } from "react-dom/test-utils";

import { renderHook } from "@testing-library/react-hooks";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { useFetchAny, UpstreamT } from "./useFetchAny";

describe("useFetchAny", () => {
  beforeAll(() => {
    fetchMock.mock("http://localhost/ok", "body ok");
    fetchMock.mock("http://localhost/ok/json", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" }),
    });
    fetchMock.mock("http://localhost/500", {
      status: 500,
      body: "fake error",
    });
    fetchMock.mock("http://localhost/error", {
      throws: new TypeError("failed to fetch"),
    });
  });

  beforeEach(() => {
    fetchMock.resetHistory();
  });

  afterEach(() => {
    fetchMock.resetHistory();
  });

  it("does nothing on empty upstream list", async () => {
    const upstreams: UpstreamT[] = [];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(fetchMock.calls()).toHaveLength(0);
    expect(result.current.inProgress).toBe(false);
  });

  it("sends a GET request by default", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      method: "GET",
      credentials: "include",
      mode: "cors",
      redirect: "follow",
    });
  });

  it("uses options from upstream", async () => {
    const upstreams: UpstreamT[] = [
      {
        uri: "http://localhost/ok",
        options: { method: "POST", credentials: "same-origin" },
      },
    ];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      mode: "cors",
      redirect: "follow",
    });
  });

  it("sends correct headers", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("plain response is updated after successful fetch", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok");
  });

  it("JSON response is updated after successful fetch", async () => {
    const upstreams = [{ uri: "http://localhost/ok/json", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok/json");
  });

  it("error is updated after 500 error", async () => {
    const upstreams = [{ uri: "http://localhost/500", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("error is updated after an exception", async () => {
    const upstreams = [{ uri: "http://localhost/error", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.mock(
      "http://localhost/slow/ok",
      new Promise((res) => setTimeout(() => res("ok"), 1000))
    );

    const upstreams = [{ uri: "http://localhost/slow/ok", options: {} }];
    const Component = () => {
      const { response, error, inProgress } = useFetchAny<string>(upstreams);
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{inProgress}</span>
        </span>
      );
    };

    const tree = mount(<Component />);
    tree.unmount();

    await fetchMock.flush(true);
  });

  it("doesn't update error on 500 response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/500", {
      delay: 1000,
      status: 500,
      body: "error",
    });

    const upstreams = [{ uri: "http://localhost/slow/500", options: {} }];
    const Component = () => {
      const { response, error, inProgress } = useFetchAny<string>(upstreams);
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{inProgress}</span>
        </span>
      );
    };

    act(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

    await fetchMock.flush(true);
  });

  it("doesn't update error on failed response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/error", {
      delay: 1000,
      throws: new TypeError("failed to fetch"),
    });

    const upstreams = [{ uri: "http://localhost/slow/error", options: {} }];
    const Component = () => {
      const { response, error, inProgress } = useFetchAny<string>(upstreams);
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{inProgress}</span>
        </span>
      );
    };

    act(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

    await fetchMock.flush(true);
  });

  it("doesn't retry on success", async () => {
    const upstreams = [
      { uri: "http://localhost/ok", options: {} },
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.calls()[0][0]).toBe("http://localhost/ok");

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok");
  });

  it("tries all URIs from the list on failures", async () => {
    const upstreams = [
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
      { uri: "http://localhost/ok", options: {} },
    ];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(3);
    expect(fetchMock.calls()[0][0]).toBe("http://localhost/500");
    expect(fetchMock.calls()[1][0]).toBe("http://localhost/error");
    expect(fetchMock.calls()[2][0]).toBe("http://localhost/ok");

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok");
  });

  it("first working URI sets the response", async () => {
    const upstreams = [
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/ok/json", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[0][0]).toBe("http://localhost/500");
    expect(fetchMock.calls()[1][0]).toBe("http://localhost/ok/json");

    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok/json");
  });

  it("uses last error in the result", async () => {
    const upstreams = [
      { uri: "http://localhost/error", options: {} },
      { uri: "http://localhost/500", options: {} },
    ];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams)
    );

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("doesn't update response after cleanup on slow body read", async () => {
    let tree: any = null;
    const resp = new Response() as any;
    resp.headers = {
      get: () => "text/plain",
    };
    resp.text = async () => {
      act(() => {
        tree.unmount();
      });
      return "ok";
    };
    const fetcher = jest.fn((_: RequestInfo) => Promise.resolve(resp));

    const upstreams = [{ uri: "http://localhost/slow/body", options: {} }];
    const Component = () => {
      const { response, error, inProgress } = useFetchAny<string>(upstreams, {
        fetcher: fetcher,
      });
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{inProgress}</span>
        </span>
      );
    };

    act(() => {
      tree = mount(<Component />);
    });
  });
});
