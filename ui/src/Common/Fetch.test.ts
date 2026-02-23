import { CommonOptions, FetchGet, FetchRetryConfig } from "./Fetch";

import merge from "lodash.merge";

import fetchMock from "@fetch-mock/jest";

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.route("*", {
    status: 200,
    body: "ok",
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.mockReset();
});

describe("Fetch", () => {
  const tests = {
    FetchGet: FetchGet,
  };

  const methodOptions: { [key: string]: RequestInit } = {
    FetchGet: { method: "get", mode: "cors" },
  };

  for (const [name, func] of Object.entries(tests)) {
    it(`${name}: passes '{credentials: include}' to all requests`, async () => {
      const request = func("http://example.com/", {}, jest.fn());
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetchMock.callHistory.lastCall()?.url).toBe("http://example.com/");
      expect(fetchMock.callHistory.lastCall()?.options).toEqual(
        merge({}, CommonOptions, methodOptions[name]),
      );
    });

    it(`${name}: custom keys are merged with defaults`, async () => {
      const request = func(
        "http://example.com/",
        {
          keepalive: false,
        },
        () => {},
      );
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetchMock.callHistory.lastCall()?.url).toBe("http://example.com/");
      expect(fetchMock.callHistory.lastCall()?.options).toEqual(
        merge(
          {},
          CommonOptions,
          methodOptions[name],
          { keepalive: false },
          () => {},
        ),
      );
    });

    it(`${name}: custom credentials are used when passed`, async () => {
      const request = func(
        "http://example.com",
        {
          credentials: "omit",
          redirect: "follow",
        },
        () => {},
      );
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetchMock.callHistory.lastCall()?.url).toBe("http://example.com/");
      expect(fetchMock.callHistory.lastCall()?.options).toEqual(
        merge({}, CommonOptions, methodOptions[name], {
          credentials: "omit",
          redirect: "follow",
        }),
      );
    });
  }

  it("FetchGet switches to no-cors for the last retry", async () => {
    fetchMock.mockReset();
    fetchMock.route("*", {
      throws: new Error("Fetch error"),
    });

    const request = FetchGet("http://example.com", {}, jest.fn());
    await expect(request).rejects.toThrow("Fetch error");

    expect(fetchMock.callHistory.calls()).toHaveLength(
      FetchRetryConfig.retries + 1,
    );
    expect(fetchMock.callHistory.calls().map((r) => r?.options)).toMatchObject(
      Array.from(Array(FetchRetryConfig.retries + 1).keys(), (i) => ({
        mode: i < FetchRetryConfig.retries ? "cors" : "no-cors",
        credentials: "include",
      })),
    );
    // ensure that the the second to last call was with cors
    expect(
      fetchMock.callHistory.calls()[fetchMock.callHistory.calls().length - 2]
        ?.options,
    ).toMatchObject({
      mode: "cors",
      credentials: "include",
    });
    // ensure that the last call was with no-cors
    expect(fetchMock.callHistory.lastCall()?.options).toMatchObject({
      mode: "no-cors",
      credentials: "include",
    });
  });

  it("FetchGet calls beforeRetry before each retry", async () => {
    fetchMock.mockReset();
    fetchMock.route("*", {
      throws: new Error("Fetch error"),
    });

    const beforeRetrySpy = jest.fn();

    const request = FetchGet("http://example.com", {}, beforeRetrySpy);
    await expect(request).rejects.toThrow("Fetch error");

    expect(beforeRetrySpy).toHaveBeenCalledTimes(FetchRetryConfig.retries + 1);

    for (let i = 0; i < FetchRetryConfig.retries + 1; i++) {
      expect(beforeRetrySpy.mock.calls[i][0]).toBe(i + 1);
    }
  });
});
