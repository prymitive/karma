import fetchMock from "fetch-mock";

import { EmptyAPIResponse } from "__fixtures__/Fetch";
import { DefaultsBase64 } from "__fixtures__/Defaults";
import { mockMatchMedia } from "__fixtures__/matchMedia";

const settingsElement = {
  dataset: {
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
