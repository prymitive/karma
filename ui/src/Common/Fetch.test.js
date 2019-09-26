import { FetchWithCredentials } from "./Fetch";

beforeEach(() => {
  fetch.resetMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("FetchWithCredentials", () => {
  it("fetch passes '{credentials: include}' to all requests", async () => {
    const request = FetchWithCredentials("http://example.com", {});
    await expect(request).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("http://example.com", {
      credentials: "include"
    });
  });

  it("custom keys are merged with defaults", async () => {
    const request = FetchWithCredentials("http://example.com", {
      foo: "bar"
    });
    await expect(request).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("http://example.com", {
      credentials: "include",
      foo: "bar"
    });
  });

  it("custom credentials are used when passed", async () => {
    const request = FetchWithCredentials("http://example.com", {
      credentials: "none"
    });
    await expect(request).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("http://example.com", {
      credentials: "none"
    });
  });
});
