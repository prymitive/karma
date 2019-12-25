import { CommonOptions, FetchGet, FetchPost, FetchDelete } from "./Fetch";

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
    FetchDelete: FetchDelete
  };

  const methodOptions = {
    FetchGet: { method: "GET", mode: "cors" },
    FetchPost: { method: "POST" },
    FetchDelete: { method: "DELETE" }
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
        foo: "bar"
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
        redirect: "follow"
      });
      await expect(request).resolves.toMatchObject({ status: 200 });
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name], {
          credentials: "none",
          redirect: "follow"
        })
      );
    });
  }

  it("FetchGet switches to no-cors after 80% failures", async () => {
    fetch.mockReject(new Error("Fetch error"));

    const request = FetchGet("http://example.com", {});
    await expect(request).rejects.toThrow("Fetch error");

    expect(fetch).toHaveBeenCalledTimes(11);
    expect(fetch).toHaveBeenCalledWith("http://example.com", {
      method: "GET",
      credentials: "include",
      mode: "no-cors",
      redirect: "follow"
    });
    for (let i = 0; i <= 10; i++) {
      expect(fetch.mock.calls[i][1]).toMatchObject({
        mode: i < 8 ? "cors" : "no-cors"
      });
    }
  });

  it("FetchGet calls beforeRetry before each retry", async () => {
    fetch.mockReject(new Error("Fetch error"));

    const beforeRetrySpy = jest.fn();

    const request = FetchGet("http://example.com", {}, beforeRetrySpy);
    await expect(request).rejects.toThrow("Fetch error");

    expect(beforeRetrySpy).toHaveBeenCalledTimes(11);

    for (let i = 0; i < 10; i++) {
      expect(beforeRetrySpy.mock.calls[i][0]).toBe(i + 1);
    }
  });
});
