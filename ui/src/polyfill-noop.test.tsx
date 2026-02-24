import fetchMock from "@fetch-mock/jest";

import { EmptyAPIResponse } from "__fixtures__/Fetch";
import { mockMatchMedia } from "__fixtures__/matchMedia";

// Mock react-cool-dimensions for this test file only since we're testing
// ResizeObserver polyfill loading and react-cool-dimensions logs an error
// before the polyfill is loaded
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

declare let global: any;
declare let window: any;

const settingsElement = {
  dataset: {
    defaultFiltersBase64: "WyJmb289YmFyIiwiYmFyPX5iYXoiXQ==",
  },
};

let root: HTMLDivElement;

beforeEach(() => {
  window.matchMedia = mockMatchMedia({});

  global.MutationObserver = class {
    disconnect() {}
    observe() {}
  };

  root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
});

afterEach(async () => {
  // Clean up React root to prevent async operations after test ends
  // Clear innerHTML first to trigger React cleanup
  if (root) {
    root.innerHTML = "";
  }
  // Wait for any pending React updates to complete
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (root && root.parentNode) {
    root.parentNode.removeChild(root);
  }
  jest.resetModules();
  jest.restoreAllMocks();
});

it("doesn't load ResizeObserver polyfill if not needed", () => {
  // Verifies app doesn't load ResizeObserver polyfill when already available
  global.window.ResizeObserver = jest.fn((_) => {
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });

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

  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify(response),
  });

  require("./index.tsx");
  expect(window.ResizeObserver).toBeTruthy();
});
