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
    FetchGet: { method: "GET" },
    FetchPost: { method: "POST" },
    FetchDelete: { method: "DELETE" }
  };

  for (const [name, func] of Object.entries(tests)) {
    it(`${name}: passes '{credentials: include}' to all requests`, async () => {
      const request = func("http://example.com", {});
      await expect(request).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name])
      );
    });

    it(`${name}: custom keys are merged with defaults`, async () => {
      const request = func("http://example.com", {
        foo: "bar"
      });
      await expect(request).resolves.toBeUndefined();
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
      await expect(request).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        "http://example.com",
        merge({}, CommonOptions, methodOptions[name], {
          credentials: "none",
          redirect: "follow"
        })
      );
    });
  }
});
