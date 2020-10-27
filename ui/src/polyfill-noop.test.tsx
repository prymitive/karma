import fetchMock from "fetch-mock";

import { EmptyAPIResponse } from "__fixtures__/Fetch";
import { mockMatchMedia } from "__fixtures__/matchMedia";

declare let global: any;
declare let window: any;

const settingsElement = {
  dataset: {
    sentryDsn: "",
    version: "1.2.3",
    defaultFiltersBase64: "WyJmb289YmFyIiwiYmFyPX5iYXoiXQ==",
  },
};

beforeEach(() => {
  window.matchMedia = mockMatchMedia({});

  global.MutationObserver = class {
    disconnect() {}
    observe() {}
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("doesn't load ResizeObserver polyfill if not needed", () => {
  global.window.ResizeObserver = jest.fn((cb) => {
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  const root = document.createElement("div");
  jest.spyOn(global.document, "getElementById").mockImplementation((name) => {
    return name === "settings"
      ? settingsElement
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

  require("./index.tsx");
  expect(window.ResizeObserver).toBeTruthy();
});
