import { act as actReact } from "react-dom/test-utils";

import { renderHook, act } from "@testing-library/react-hooks";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { FetchRetryConfig } from "Common/Fetch";
import { useFetchGet } from "./useFetchGet";

jest.unmock("./useFetchGet");

describe("useFetchGet", () => {
  beforeAll(() => {
    fetchMock.mock("http://localhost/ok", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" }),
    });
    fetchMock.mock("http://localhost/error", {
      throws: new TypeError("failed to fetch"),
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.resetHistory();
  });

  afterEach(() => {
    fetchMock.resetHistory();
  });

  it("sends a GET request", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/ok")
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      method: "GET",
    });
  });

  it("sends correct headers", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/ok")
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
  });

  it("doesn't send any request if autorun=false", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/ok", { autorun: false })
    );

    expect(fetchMock.calls()).toHaveLength(0);

    act(() => {
      result.current.get();
    });
    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
  });

  it("will retry failed requests", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/error")
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
    expect(fetchMock.lastUrl()).toBe("http://localhost/error");

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
      useFetchGet<string>("http://localhost/ok")
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

  it("error is updated after 500 response with JSON body", async () => {
    fetchMock.mock("http://localhost/500/json", {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "error" }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/500/json")
    );

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toMatchObject({ status: "error" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after 500 response with plain body", async () => {
    fetchMock.mock("http://localhost/500/text", {
      status: 500,
      body: "error",
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/500/text")
    );

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("error");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated after failed fetch", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/error")
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await waitForNextUpdate();
    }

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("error is updated on uparsable JSON", async () => {
    fetchMock.mock("http://localhost/json/invalid", {
      headers: { "Content-Type": "application/json" },
      body: "this is not a valid JSON body",
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchGet<string>("http://localhost/json/invalid")
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(
      "invalid json response body at http://localhost/json/invalid reason: Unexpected token h in JSON at position 1"
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("doesn't update response on 200 response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/ok", {
      delay: 1000,
      body: JSON.stringify({ status: "ok" }),
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
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

    actReact(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

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
      const { response, error, isLoading } = useFetchGet<string>(
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

    actReact(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

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
      const { response, error, isLoading } = useFetchGet<string>(
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

    actReact(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

    for (let i = 0; i <= FetchRetryConfig.retries; i++) {
      jest.runOnlyPendingTimers();
      await fetchMock.flush(true);
    }
  });

  it("doesn't update error on unparsable JSON after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/json/invalid", {
      delay: 1000,
      headers: { "Content-Type": "application/json" },
      body: "this is not a valid JSON body",
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/json/invalid"
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    actReact(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

    jest.runOnlyPendingTimers();
    await fetchMock.flush(true);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.mock("http://localhost/slow/text", {
      delay: 1000,
      body: "ok",
    });

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/text"
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    actReact(() => {
      const tree = mount(<Component />);
      tree.unmount();
    });

    jest.runOnlyPendingTimers();
    await fetchMock.flush(true);
  });

  it("doesn't update response after cleanup on slow body read", async () => {
    FetchRetryConfig.retries = 0;

    let tree: any = false;
    const fetcher = (): Promise<Response> =>
      Promise.resolve({
        headers: {
          get: () => "text/plain",
        },
        text: async () => {
          actReact(() => {
            tree.unmount();
          });
          return "ok";
        },
      } as any);
    jest.useRealTimers();

    const Component = () => {
      const { response, error, isLoading } = useFetchGet<string>(
        "http://localhost/slow/body",
        { fetcher: fetcher }
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isLoading}</span>
        </span>
      );
    };

    actReact(() => {
      tree = mount(<Component />);
    });
  });
});
