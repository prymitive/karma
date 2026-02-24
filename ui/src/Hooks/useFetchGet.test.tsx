import { act } from "react";

import { renderHook, render, waitFor } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { FetchRetryConfig } from "Common/Fetch";
import { useFetchGet } from "./useFetchGet";

jest.unmock("./useFetchGet");

describe("useFetchGet", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.route("http://localhost/ok", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" }),
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

  it("sends a GET request", async () => {
    renderHook(() => useFetchGet<string>("http://localhost/ok"));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      method: "get",
    });
  });

  it("sends correct headers", async () => {
    renderHook(() => useFetchGet<string>("http://localhost/ok"));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("doesn't send any request if autorun=false", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/ok", { autorun: false }),
    );

    expect(fetchMock.callHistory.calls()).toHaveLength(0);

    act(() => {
      result.current.get();
    });
    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
  });

  it("will retry failed requests", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/error"),
    );

    // initial state
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);

    // first failed request
    await waitFor(() => expect(result.current.retryCount).toBe(1));
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(1);

    // run all retries
    for (let i = 2; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await waitFor(() => expect(result.current.retryCount).toBe(i));

      expect(result.current.response).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRetrying).toBe(true);
      expect(result.current.retryCount).toBe(i);
    }

    // final update
    jest.runOnlyPendingTimers();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(FetchRetryConfig.retries + 1);

    expect(fetchMock.callHistory.calls()).toHaveLength(
      FetchRetryConfig.retries + 1,
    );
    expect(fetchMock.callHistory.lastCall()?.url).toBe(
      "http://localhost/error",
    );

    //verify headers for each request
    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      expect(fetchMock.callHistory.calls()[i]?.options).toMatchObject({
        mode: i < FetchRetryConfig.retries ? "cors" : "no-cors",
        credentials: "include",
        redirect: "follow",
      });
    }
  });

  it("response is updated after successful fetch", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/ok"),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after 500 response with JSON body", async () => {
    fetchMock.route("http://localhost/500/json", {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "error" }),
    });

    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/500/json"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toMatchObject({ status: "error" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after 500 response with plain body", async () => {
    fetchMock.route("http://localhost/500/text", {
      status: 500,
      body: "error",
    });

    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/500/text"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("error");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after 401 error", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/401"),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("401 Unauthorized");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after failed fetch", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/error"),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
    }
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after unknown error", async () => {
    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/unknown"),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
    }
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("foo");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated on uparsable JSON", async () => {
    fetchMock.route("http://localhost/json/invalid", {
      headers: { "Content-Type": "application/json" },
      body: "this is not a valid JSON body",
    });

    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/json/invalid"),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(
      "unknown error: SyntaxError: Unexpected token 'h', \"this is not\"... is not valid JSON",
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("stops retrying when cancelGet is called before a rejection settles", async () => {
    let rejectFetch: (reason?: unknown) => void = () => {};
    const fetcher = jest.fn(
      () =>
        new Promise<Response>((_, reject) => {
          rejectFetch = reject;
        }),
    );

    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/cancel/retry", {
        fetcher,
        autorun: false,
      }),
    );

    act(() => {
      result.current.get();
    });
    await waitFor(() => expect(fetcher.mock.calls.length).toBe(1));

    act(() => {
      result.current.cancelGet();
    });

    await act(async () => {
      rejectFetch(new Error("boom"));
    });

    expect(fetcher.mock.calls.length).toBe(1);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("skips response processing when cancelled before body parsing", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetcher = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const textSpy = jest.fn(async () => "late body");
    const response = {
      ok: true,
      headers: new Headers({ "content-type": "text/plain" }),
      text: textSpy,
    } as unknown as Response;

    const { result } = renderHook(() =>
      useFetchGet<string>("http://localhost/cancel/success", {
        fetcher,
        autorun: false,
      }),
    );

    act(() => {
      result.current.get();
    });
    await waitFor(() => expect(fetcher.mock.calls.length).toBe(1));

    act(() => {
      result.current.cancelGet();
    });

    await act(async () => {
      resolveFetch(response);
    });

    expect(textSpy.mock.calls.length).toBe(0);
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("doesn't update response on 200 response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/ok", {
      delay: 1000,
      body: JSON.stringify({ status: "ok" }),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/ok",
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.callHistory.flush(true);
    }
  });

  it("doesn't update error on 500 response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/500", {
      delay: 1000,
      status: 500,
      body: JSON.stringify({ status: "error" }),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/500",
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.callHistory.flush(true);
    }
  });

  it("doesn't update error on failed response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/error", {
      delay: 1000,
      throws: new TypeError("failed to fetch"),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/error",
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.callHistory.flush(true);
    }
  });

  it("doesn't update error on unparsable JSON after cleanup", async () => {
    fetchMock.route("http://localhost/slow/json/invalid", {
      delay: 1000,
      headers: { "Content-Type": "application/json" },
      body: "this is not a valid JSON body",
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/json/invalid",
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    jest.runOnlyPendingTimers();
    await fetchMock.callHistory.flush(true);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.route("http://localhost/slow/text", {
      delay: 1000,
      body: "ok",
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/text",
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    jest.runOnlyPendingTimers();
    await fetchMock.callHistory.flush(true);
  });

  it("doesn't update response after cleanup on slow body read", async () => {
    FetchRetryConfig.retries = 0;

    let unmountFn: (() => void) | null = null;
    const fetcher = (): Promise<Response> =>
      Promise.resolve({
        headers: {
          get: () => "text/plain",
        },
        text: async () => {
          act(() => {
            if (unmountFn) unmountFn();
          });
          return "ok";
        },
      } as any);
    jest.useRealTimers();

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/body",
        { fetcher: fetcher },
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmountFn = unmount;
    });
  });
});
