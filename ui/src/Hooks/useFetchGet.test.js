import React from "react";

import { renderHook } from "@testing-library/react-hooks";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { FetchRetryConfig } from "Common/Fetch";
import { useFetchGet } from "./useFetchGet";

describe("useFetchGet", () => {
  beforeAll(() => {
    jest.useFakeTimers();

    fetchMock.mock("http://localhost/ok", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" }),
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

  it("sends a GET request", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchGet("http://localhost/ok")
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastCall()[0]).toBe("http://localhost/ok");
    expect(fetchMock.lastCall()[1]).toMatchObject({
      method: "GET",
    });
  });

  it("sends correct headers", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchGet("http://localhost/ok")
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastCall()[0]).toBe("http://localhost/ok");
    expect(fetchMock.lastCall()[1]).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("doesn't send any request if autorun=false", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet("http://localhost/ok", { autorun: false })
    );

    expect(fetchMock.calls()).toHaveLength(0);

    result.current.get();
    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastCall()[0]).toBe("http://localhost/ok");
  });

  it("will retry failed requests", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet("http://localhost/error")
    );

    // initial state
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);

    // first failed request
    await waitForNextUpdate();
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(1);

    // run all retries
    for (let i = 2; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await waitForNextUpdate();

      expect(result.current.response).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRetrying).toBe(true);
      expect(result.current.retryCount).toBe(i);
    }

    // final update
    jest.runOnlyPendingTimers();
    await waitForNextUpdate();
    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(FetchRetryConfig.retries + 1);

    expect(fetchMock.calls()).toHaveLength(FetchRetryConfig.retries + 1);
    expect(fetchMock.lastCall()[0]).toBe("http://localhost/error");

    //verify headers for each request
    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      expect(fetchMock.calls()[i][1]).toMatchObject({
        mode: i < FetchRetryConfig.retries ? "cors" : "no-cors",
        credentials: "include",
        redirect: "follow",
      });
    }
  });

  it("response is updated after successful fetch", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet("http://localhost/ok")
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    await waitForNextUpdate();

    expect(result.current.response).toMatchObject({ status: "ok" });
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("doesn't update response on 200 response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/ok", {
      delay: 1000,
      body: JSON.stringify({ status: "ok" }),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet(
        "http://localhost/slow/ok"
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    const tree = mount(<Component />);
    tree.unmount();

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.flush(true);
    }
  });

  it("doesn't update error on 500 response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/500", {
      delay: 1000,
      status: 500,
      body: JSON.stringify({ status: "error" }),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet(
        "http://localhost/slow/500"
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    const tree = mount(<Component />);
    tree.unmount();

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.flush(true);
    }
  });

  it("doesn't update error on failed response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/error", {
      delay: 1000,
      throws: new TypeError("failed to fetch"),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet(
        "http://localhost/slow/error"
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    const tree = mount(<Component />);
    tree.unmount();

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.flush(true);
    }
  });
});
