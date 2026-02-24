// Mock react-cool-dimensions to avoid ResizeObserver console.error
jest.mock("react-cool-dimensions", () => ({
  __esModule: true,
  default: () => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    width: 1000,
    height: 500,
    entry: undefined,
  }),
}));

import { act } from "react";

import { waitFor } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

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

it("renders without crashing with missing defaults div", async () => {
  // Verifies app renders with default theme when defaults div is missing
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

  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify(response),
  });

  await act(async () => {
    require("./index.tsx");
  });
  await waitFor(() => {
    expect(root.innerHTML).toMatch(/data-theme="auto"/);
  });
});

it("renders without crashing with defaults present", async () => {
  // Verifies app renders when defaults div is present
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

  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify(response),
  });

  await act(async () => {
    require("./index.tsx");
  });
});
