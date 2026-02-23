import { act } from "react-dom/test-utils";

import { renderHook } from "@testing-library/react-hooks";
import { render } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { useFetchAny, UpstreamT } from "./useFetchAny";

describe("useFetchAny", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.route("http://localhost/ok", "body ok");
    fetchMock.route("http://localhost/ok/json", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" }),
    });
    fetchMock.route("http://localhost/500", {
      status: 500,
      body: "fake error",
    });
    fetchMock.route("http://localhost/401", 401);
    fetchMock.route("http://localhost/error", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.route("http://localhost/unknown", {
      throws: new Error("foo"),
    });
  });

  afterEach(() => {
    fetchMock.mockClear();
  });

  it("does nothing on empty upstream list", async () => {
    const upstreams: UpstreamT[] = [];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(fetchMock.callHistory.calls()).toHaveLength(0);
    expect(result.current.inProgress).toBe(false);
  });

  it("sends a GET request by default", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      method: "get",
      credentials: "include",
      mode: "cors",
      redirect: "follow",
    });
  });

  it("uses options from upstream", async () => {
    const upstreams: UpstreamT[] = [
      {
        uri: "http://localhost/ok",
        options: { method: "post", credentials: "same-origin" },
      },
    ];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      method: "post",
      credentials: "same-origin",
      mode: "cors",
      redirect: "follow",
    });
  });

  it("sends correct headers", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { waitForNextUpdate } = renderHook(() => useFetchAny(upstreams));

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("plain response is updated after successful fetch", async () => {
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams),
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
      useFetchAny(upstreams),
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

  it("error is using status code if body is empty", async () => {
    const upstreams = [{ uri: "http://localhost/401", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("401 Unauthorized");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("error is updated after 500 error", async () => {
    const upstreams = [{ uri: "http://localhost/500", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams),
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
      useFetchAny(upstreams),
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

  it("error is updated after unknown error", async () => {
    const upstreams = [{ uri: "http://localhost/unknown", options: {} }];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("foo");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.route(
      "http://localhost/slow/ok",
      new Promise((res) => setTimeout(() => res("ok"), 1000)),
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

    const { unmount } = render(<Component />);
    unmount();

    await fetchMock.callHistory.flush(true);
  });

  it("doesn't update error on 500 response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/500", {
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
      const { unmount } = render(<Component />);
      unmount();
    });

    await fetchMock.callHistory.flush(true);
  });

  it("doesn't update error on failed response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/error", {
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
      const { unmount } = render(<Component />);
      unmount();
    });

    await fetchMock.callHistory.flush(true);
  });

  it("doesn't retry on success", async () => {
    const upstreams = [
      { uri: "http://localhost/ok", options: {} },
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchAny(upstreams),
    );

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.calls()[0]?.url).toBe("http://localhost/ok");

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
      useFetchAny(upstreams),
    );

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(3);
    expect(fetchMock.callHistory.calls()[0]?.url).toBe("http://localhost/500");
    expect(fetchMock.callHistory.calls()[1]?.url).toBe(
      "http://localhost/error",
    );
    expect(fetchMock.callHistory.calls()[2]?.url).toBe("http://localhost/ok");

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
      useFetchAny(upstreams),
    );

    await waitForNextUpdate();

    expect(fetchMock.callHistory.calls()).toHaveLength(2);
    expect(fetchMock.callHistory.calls()[0]?.url).toBe("http://localhost/500");
    expect(fetchMock.callHistory.calls()[1]?.url).toBe(
      "http://localhost/ok/json",
    );

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
      useFetchAny(upstreams),
    );

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });
});
