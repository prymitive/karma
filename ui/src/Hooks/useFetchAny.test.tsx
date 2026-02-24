import { act } from "react";

import { renderHook, render, waitFor } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { useFetchAny, UpstreamT, FetchFunctionT } from "./useFetchAny";

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
    renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

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
    renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

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
    renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

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
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok");
  });

  it("JSON response is updated after successful fetch", async () => {
    const upstreams = [{ uri: "http://localhost/ok/json", options: {} }];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe("http://localhost/ok/json");
  });

  it("error is using status code if body is empty", async () => {
    const upstreams = [{ uri: "http://localhost/401", options: {} }];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("401 Unauthorized");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("error is updated after 500 error", async () => {
    const upstreams = [{ uri: "http://localhost/500", options: {} }];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("error is updated after an exception", async () => {
    const upstreams = [{ uri: "http://localhost/error", options: {} }];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("error is updated after unknown error", async () => {
    const upstreams = [{ uri: "http://localhost/unknown", options: {} }];
    const { result } = renderHook(() => useFetchAny(upstreams));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.inProgress).toBe(true);
    expect(result.current.responseURI).toBe(null);

    await waitFor(() => expect(result.current.inProgress).toBe(false));

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

  it("skips updating state when unmounted during body parsing", async () => {
    let resolveJson: (value: unknown) => void = () => {};
    const jsonSpy = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveJson = resolve;
        }),
    );
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      json: jsonSpy,
    } as unknown as Response;

    const fetcher = jest.fn() as jest.MockedFunction<FetchFunctionT>;
    fetcher.mockResolvedValue(mockResponse);

    const upstreams = [{ uri: "http://localhost/cancel/json", options: {} }];
    const { result, unmount } = renderHook(() =>
      useFetchAny<string>(upstreams, { fetcher }),
    );

    await waitFor(() => expect(jsonSpy.mock.calls.length).toBe(1));

    unmount();

    await act(async () => {
      resolveJson({ data: "late" });
    });

    expect(fetcher.mock.calls.length).toBe(1);
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("skips error updates when unmounted before rejection settles", async () => {
    let rejectFetch: (reason?: unknown) => void = () => {};
    const fetcher = jest.fn() as jest.MockedFunction<FetchFunctionT>;
    fetcher.mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          rejectFetch = reject;
        }),
    );

    const upstreams = [{ uri: "http://localhost/cancel/error", options: {} }];
    const { result, unmount } = renderHook(() =>
      useFetchAny<string>(upstreams, { fetcher }),
    );

    unmount();

    await act(async () => {
      rejectFetch(new Error("late boom"));
    });

    expect(fetcher.mock.calls.length).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("doesn't retry on success", async () => {
    const upstreams = [
      { uri: "http://localhost/ok", options: {} },
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];
    const { result } = renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

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
    const { result } = renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

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
    const { result } = renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

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
    const { result } = renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.inProgress).toBe(false);
    expect(result.current.responseURI).toBe(null);
  });

  it("parses JSON from the final upstream even after failures", async () => {
    const upstreams = [
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/ok/json", options: {} },
    ];
    const { result } = renderHook(() => useFetchAny(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(fetchMock.callHistory.calls()).toHaveLength(2);
    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.responseURI).toBe("http://localhost/ok/json");
    expect(result.current.error).toBe(null);
  });

  it("propagates error from custom fetcher on last upstream", async () => {
    const failingFetcher = jest
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockRejectedValueOnce(new Error("boom"));

    const upstreams = [
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];

    const { result } = renderHook(() =>
      useFetchAny<string>(upstreams, { fetcher: failingFetcher }),
    );

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(failingFetcher.mock.calls.length).toBe(2);
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("boom");
    expect(result.current.responseURI).toBe(null);
  });

  it("reset clears previous response state without triggering another fetch", async () => {
    // Scenario: consumer wants to drop stale successful data but keeps the same upstream list
    const upstreams = [{ uri: "http://localhost/ok", options: {} }];
    const { result } = renderHook(() => useFetchAny<string>(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe("body ok");
    expect(fetchMock.callHistory.calls()).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.responseURI).toBe(null);
    expect(result.current.inProgress).toBe(false);
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
  });

  it("reset restarts fetching when previous failures advanced through upstreams", async () => {
    // Scenario: previous attempts exhausted the list so the hook should return to the first URI after reset
    const upstreams = [
      { uri: "http://localhost/500", options: {} },
      { uri: "http://localhost/error", options: {} },
    ];
    const { result } = renderHook(() => useFetchAny<string>(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(fetchMock.callHistory.calls()).toHaveLength(2);

    act(() => {
      result.current.reset();
    });

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(4));
    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(fetchMock.callHistory.calls()[2]?.url).toBe("http://localhost/500");
    expect(fetchMock.callHistory.calls()[3]?.url).toBe(
      "http://localhost/error",
    );
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.responseURI).toBe(null);
  });

  it("sets fallback message when thrown value is not Error", async () => {
    // Scenario: fetch rejects with a plain object so the hook must surface the fallback error text
    fetchMock.route("http://localhost/non-error", {
      throws: { foo: "bar" } as unknown as Error,
    });

    const upstreams = [{ uri: "http://localhost/non-error", options: {} }];
    const { result } = renderHook(() => useFetchAny<string>(upstreams));

    await waitFor(() => expect(result.current.inProgress).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("unknown error: [object Object]");
    expect(result.current.responseURI).toBe(null);
  });
});
