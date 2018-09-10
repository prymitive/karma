import { EmptyAPIResponse } from "__mocks__/Fetch";

it("renders without crashing", () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetch.mockResponse(JSON.stringify(response));
  const Index = require("./index.js");
  expect(Index).toBeTruthy();
});

describe("console", () => {
  it("console.error() throws an error", () => {
    expect(() => {
      console.error("foo");
    }).toThrowError("message=foo args=");
  });

  it("console.warn() throws an error", () => {
    expect(() => {
      console.warn("foo", "bar");
    }).toThrowError("message=foo args=bar");
  });

  it("console.info() throws an error", () => {
    expect(() => {
      console.warn("foo", "bar", "abc");
    }).toThrowError("message=foo args=bar,abc");
  });

  it("console.log() throws an error", () => {
    expect(() => {
      console.warn("foo bar");
    }).toThrowError("message=foo bar args=");
  });

  it("console.trace() throws an error", () => {
    expect(() => {
      console.warn();
    }).toThrowError("message=undefined args=");
  });
});
