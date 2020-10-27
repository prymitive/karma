import fetchMock from "fetch-mock";

import { EmptyAPIResponse } from "__fixtures__/Fetch";
import { DefaultsBase64 } from "__fixtures__/Defaults";
import { mockMatchMedia } from "__fixtures__/matchMedia";

const settingsElement = {
  dataset: {
    sentryDsn: "",
    version: "1.2.3",
    defaultFiltersBase64: "WyJmb289YmFyIiwiYmFyPX5iYXoiXQ==",
  },
};

beforeEach(() => {
  window.matchMedia = mockMatchMedia({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("renders without crashing with missing defaults div", () => {
  const root = document.createElement("div");
  jest
    .spyOn(global.document, "getElementById")
    .mockImplementation((name: string) => {
      return name === "settings"
        ? (settingsElement as any)
        : name === "defaults"
        ? null
        : name === "root"
        ? root
        : null;
    });
  const response = EmptyAPIResponse();
  response.filters = [];

  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify(response),
  });

  const Index = require("./index.tsx");
  expect(Index).toBeTruthy();
  expect(root.innerHTML).toMatch(/data-theme="auto"/);
});

it("renders without crashing with defaults present", () => {
  const root = document.createElement("div");
  jest
    .spyOn(global.document, "getElementById")
    .mockImplementation((name: string) => {
      return name === "settings"
        ? (settingsElement as any)
        : name === "defaults"
        ? {
            innerHTML: DefaultsBase64,
          }
        : name === "root"
        ? root
        : null;
    });
  const response = EmptyAPIResponse();
  response.filters = [];

  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify(response),
  });

  const Index = require("./index.tsx");
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
      console.info("foo", "bar", "abc");
    }).toThrowError("message=foo args=bar,abc");
  });

  it("console.log() throws an error", () => {
    expect(() => {
      console.log("foo bar");
    }).toThrowError("message=foo bar args=");
  });

  it("console.trace() throws an error", () => {
    expect(() => {
      console.trace();
    }).toThrowError("message=undefined args=");
  });

  it("console.warn() with React deprecation warning doesn't throw any error", () => {
    // https://reactjs.org/blog/2019/08/08/react-v16.9.0.html#new-deprecations
    const msg = [
      "Warning: componentWillMount has been renamed, and is not recommended for use. See https://fb.me/react-async-component-lifecycle-hooks for details.",
      "* Move code with side effects to componentDidMount, and set initial state in the constructor.",
      "* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 17.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.",
      "Please update the following components: foo",
    ].join("\n");
    expect(() => {
      console.warn(msg);
    }).not.toThrow();
  });
});
