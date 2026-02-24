import { act } from "react";

import { renderHook, render, waitFor } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { useFetchDelete } from "./useFetchDelete";

describe("useFetchDelete", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.route("http://localhost/ok", "body ok");
    fetchMock.route("http://localhost/401", 401);
    fetchMock.route("http://localhost/500", {
      status: 500,
      body: "fake error",
    });
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

  const EmptyOptions = {};

  it("sends a DELETE request", async () => {
    renderHook(() => useFetchDelete("http://localhost/ok", EmptyOptions));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      method: "delete",
    });
  });

  it("sends correct headers", async () => {
    renderHook(() => useFetchDelete("http://localhost/ok", EmptyOptions));

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.lastCall()?.url).toBe("http://localhost/ok");
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("response is updated after successful fetch", async () => {
    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/ok", EmptyOptions),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after 401 error", async () => {
    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/401", EmptyOptions),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("401 Unauthorized");
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after 500 error", async () => {
    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/500", EmptyOptions),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after an exception", async () => {
    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/error", EmptyOptions),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after unknown error", async () => {
    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/unknown", EmptyOptions),
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("foo");
    expect(result.current.isDeleting).toBe(false);
  });

  it("sets fallback message when thrown value is not Error", async () => {
    // Scenario: fetch rejects with a plain value so the hook must use fallback message formatting
    fetchMock.route("http://localhost/non-error", {
      throws: "boom" as unknown as Error,
    });

    const { result } = renderHook(() =>
      useFetchDelete("http://localhost/non-error", EmptyOptions),
    );

    await waitFor(() => expect(result.current.isDeleting).toBe(false));

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("unknown error: boom");
    expect(result.current.isDeleting).toBe(false);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.route(
      "http://localhost/slow/ok",
      new Promise((res) => setTimeout(() => res("ok"), 1000)),
    );

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/ok",
        EmptyOptions,
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isDeleting}</span>
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

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/500",
        EmptyOptions,
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isDeleting}</span>
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

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/error",
        EmptyOptions,
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isDeleting}</span>
        </span>
      );
    };

    act(() => {
      const { unmount } = render(<Component />);
      unmount();
    });

    await fetchMock.callHistory.flush(true);
  });

  it("ignores rejection if fetch fails after cleanup", async () => {
    let rejectFn: (reason?: unknown) => void = () => {};
    fetchMock.route(
      "http://localhost/slow/reject",
      new Promise((_resolve, reject) => {
        rejectFn = reject;
      }),
    );

    const { unmount } = renderHook(() =>
      useFetchDelete("http://localhost/slow/reject", EmptyOptions),
    );

    await waitFor(() => expect(fetchMock.callHistory.calls()).toHaveLength(1));

    unmount();

    await act(async () => {
      rejectFn(new Error("boom"));
    });

    await fetchMock.callHistory.flush(true);
  });
});
