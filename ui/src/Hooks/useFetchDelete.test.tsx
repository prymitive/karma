import { act } from "react-dom/test-utils";

import { renderHook } from "@testing-library/react-hooks";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { useFetchDelete } from "./useFetchDelete";

describe("useFetchDelete", () => {
  beforeAll(() => {
    fetchMock.mock("http://localhost/ok", "body ok");
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

  const EmptyOptions = {};

  it("sends a DELETE request", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchDelete("http://localhost/ok", EmptyOptions)
    );

    await waitForNextUpdate();

    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastUrl()).toBe("http://localhost/ok");
    expect(fetchMock.lastOptions()).toMatchObject({
      method: "DELETE",
    });
  });

  it("sends correct headers", async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useFetchDelete("http://localhost/ok", EmptyOptions)
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

  it("response is updated after successful fetch", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchDelete("http://localhost/ok", EmptyOptions)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitForNextUpdate();

    expect(result.current.response).toBe("body ok");
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after 500 error", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchDelete("http://localhost/500", EmptyOptions)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("fake error");
    expect(result.current.isDeleting).toBe(false);
  });

  it("error is updated after an exception", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchDelete("http://localhost/error", EmptyOptions)
    );

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isDeleting).toBe(true);

    await waitForNextUpdate();

    expect(result.current.response).toBe(null);
    expect(result.current.error).toBe("failed to fetch");
    expect(result.current.isDeleting).toBe(false);
  });

  it("doesn't update response after cleanup", async () => {
    fetchMock.mock(
      "http://localhost/slow/ok",
      new Promise((res) => setTimeout(() => res("ok"), 1000))
    );

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/ok",
        EmptyOptions
      );
      return (
        <span>
          <span>{response}</span>
          <span>{error}</span>
          <span>{isDeleting}</span>
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

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/500",
        EmptyOptions
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

    const Component = () => {
      const { response, error, isDeleting } = useFetchDelete(
        "http://localhost/slow/error",
        EmptyOptions
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
      const tree = mount(<Component />);
      tree.unmount();
    });

    await fetchMock.flush(true);
  });
});
