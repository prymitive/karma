import { CommonOptions, FetchGet, FetchPost, FetchRetryConfig } from "./Fetch";

import merge from "lodash/merge";

beforeEach(() => {
  fetch.resetMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Fetch", () => {
  const tests = {
    FetchGet: FetchGet,
    FetchPost: FetchPost,
  };

  const methodOptions = {
    FetchGet: { method: "GET", mode: "cors" },
    FetchPost: { method: "POST" },
  };

  for (const [name, func] of Object.entries(tests)) {
    it(`${name}: passes '{credentials: include}' to all requests`, async () => {
      const request = func("http://example.com", {});
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name])
      );
    });

    it(`${name}: custom keys are merged with defaults`, async () => {
      const request = func("http://example.com", {
        foo: "bar",
      });
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name], { foo: "bar" })
      );
    });

    it(`${name}: custom credentials are used when passed`, async () => {
      const request = func("http://example.com", {
        credentials: "none",
        redirect: "follow",
      });
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name], {
          credentials: "none",
          redirect: "follow",
        })
      );
    });
  }

  it("FetchGet switches to no-cors for the last retry", async () => {
    fetch.mockReject(new Error("Fetch error"));

    const request = FetchGet("http://example.com", {});
    await expect(request).rejects.toThrow("Fetch error");

    expect(fetch).toHaveBeenCalledTimes(FetchRetryConfig.retries + 1);
    expect(fetch.mock.calls.map((r) => r[1])).toMatchObject(
      Array.from(Array(FetchRetryConfig.retries + 1).keys(), (i) => ({
        mode: i < FetchRetryConfig.retries ? "cors" : "no-cors",
        credentials: "include",
      }))
    );
    // ensure that the the second to last call was with cors
    expect(fetch.mock.calls[fetch.mock.calls.length - 2][1]).toMatchObject({
      mode: "cors",
      credentials: "include",
    });
    // ensure that the last call was with no-cors
    expect(fetch.mock.calls[fetch.mock.calls.length - 1][1]).toMatchObject({
      mode: "no-cors",
      credentials: "include",
    });
  });

  it("FetchGet calls beforeRetry before each retry", async () => {
    fetch.mockReject(new Error("Fetch error"));

    const beforeRetrySpy = jest.fn();

    const request = FetchGet("http://example.com", {}, beforeRetrySpy);
    await expect(request).rejects.toThrow("Fetch error");

    expect(beforeRetrySpy).toHaveBeenCalledTimes(FetchRetryConfig.retries + 1);

    for (let i = 0; i < FetchRetryConfig.retries + 1; i++) {
      expect(beforeRetrySpy.mock.calls[i][0]).toBe(i + 1);
    }
  });
});
