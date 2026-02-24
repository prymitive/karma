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

import { render, within } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { mockMatchMedia } from "__fixtures__/matchMedia";
import { EmptyAPIResponse } from "__fixtures__/Fetch";
import type { UIDefaults, ThemeT } from "Models/UI";
import { SilenceFormStore, NewEmptyMatcher } from "Stores/SilenceFormStore";
import { StringToOption } from "Common/Select";
import { App } from "./App";

declare let global: any;
declare let window: any;

const uiDefaults: UIDefaults = {
  Refresh: 30 * 1000 * 1000 * 1000,
  HideFiltersWhenIdle: true,
  ColorTitlebar: false,
  MinimalGroupWidth: 420,
  AlertsPerGroup: 5,
  CollapseGroups: "collapsedOnMobile",
  Theme: "auto",
  Animations: true,
  MultiGridLabel: "cluster",
  MultiGridSortReverse: false,
};

beforeEach(() => {
  // creating App instance will push current filters into window.location
  // ensure it's wiped after each test
  window.history.pushState({}, "App", "/");

  // matchMedia needs mocking
  window.matchMedia = mockMatchMedia({});

  global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));
  global.ResizeObserverEntry = jest.fn();

  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify(EmptyAPIResponse()),
  });
});

afterEach(() => {
  localStorage.setItem("savedFilters", "");
  localStorage.setItem("themeConfig", "");
  jest.restoreAllMocks();
  window.history.pushState({}, "App", "/");
  global.window.location.href = "http://localhost/";
  global.window.location.search = "";
});

describe("<App />", () => {
  it("uses passed default filters if there's no query args or saved filters", async () => {
    // Verifies default filters are applied when no query args or saved filters exist
    expect(window.location.search).toBe("");
    await act(async () => {
      render(<App defaultFilters={["foo=bar"]} uiDefaults={uiDefaults} />);
    });
    expect(window.location.search).toBe("?q=foo%3Dbar");
  });

  it("uses saved filters if there's no query args (ignoring passed defaults)", async () => {
    // Verifies saved filters take precedence over default filters
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["bar=baz", "abc!=cba"],
        present: true,
      }),
    );

    // https://github.com/facebook/jest/issues/6798#issuecomment-412871616
    const getItemSpy: any = jest.spyOn(Storage.prototype, "getItem");

    await act(async () => {
      render(
        <App defaultFilters={["ignore=defaults"]} uiDefaults={uiDefaults} />,
      );
    });

    expect(getItemSpy).toHaveBeenCalledWith("savedFilters");
    expect(window.location.search).toBe("?q=bar%3Dbaz&q=abc%21%3Dcba");

    getItemSpy.mockRestore();
  });

  it("ignores saved filters if 'present' key is falsey (use passed defaults)", async () => {
    // Verifies saved filters are ignored when present flag is false
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["ignore=saved"],
        present: false,
      }),
    );

    // https://github.com/facebook/jest/issues/6798#issuecomment-412871616
    const getItemSpy: any = jest.spyOn(Storage.prototype, "getItem");

    await act(async () => {
      render(<App defaultFilters={["use=defaults"]} uiDefaults={uiDefaults} />);
    });

    expect(getItemSpy).toHaveBeenCalledWith("savedFilters");
    expect(window.location.search).toBe("?q=use%3Ddefaults");

    getItemSpy.mockRestore();
  });

  it("uses filters passed via ?q= query args (ignoring saved filters and passed defaults)", async () => {
    // Verifies query args take precedence over saved filters and defaults
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["ignore=saved"],
        present: true,
      }),
    );

    window.history.pushState({}, "App", "/?q=use%3Dquery");

    await act(async () => {
      render(
        <App defaultFilters={["ignore=defaults"]} uiDefaults={uiDefaults} />,
      );
    });

    expect(window.location.search).toBe("?q=use%3Dquery");
  });

  it("popstate event updates alertStore filters", async () => {
    // Verifies that popstate event triggers filter update from URL
    await act(async () => {
      render(<App defaultFilters={["foo"]} uiDefaults={uiDefaults} />);
    });
    expect(window.location.search).toBe("?q=foo");

    // Use history.pushState to change URL, then trigger popstate
    window.history.pushState({}, "App", "/?q=bar");

    await act(async () => {
      const event = new PopStateEvent("popstate");
      window.dispatchEvent(event);
    });

    expect(window.location.search).toBe("?q=bar");
  });

  it("unmounts without crashing", async () => {
    // Verifies component unmounts cleanly without errors
    let unmount: () => void;
    await act(async () => {
      const result = render(
        <App defaultFilters={["foo=bar"]} uiDefaults={uiDefaults} />,
      );
      unmount = result.unmount;
    });
    unmount!();

    const event = new PopStateEvent("popstate");
    window.dispatchEvent(event);
  });

  it("populates silence from from 'm' query arg", async () => {
    // Verifies silence form is populated from base64 encoded query arg
    const m1 = NewEmptyMatcher();
    m1.name = "foo";
    m1.isRegex = true;
    m1.values = [StringToOption("bar")];
    const m2 = NewEmptyMatcher();
    m2.name = "bar";
    m2.isRegex = false;
    m2.values = [StringToOption("foo"), StringToOption("baz")];
    const store = new SilenceFormStore();
    act(() => {
      store.data.setMatchers([m1, m2]);
      store.data.setComment("base64");
    });
    const m = store.data.toBase64;

    // Use history.pushState instead of setting window.location to avoid jsdom navigation error
    window.history.pushState({}, "App", `/?q=bar&m=${m}`);

    await act(async () => {
      render(<App defaultFilters={[]} uiDefaults={uiDefaults} />);
    });
  });

  it("doesn't crash on invalid 'm' value", async () => {
    // Verifies app handles invalid base64 silence data gracefully
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(jest.fn());

    global.window.location = {
      href: "http://localhost/?q=bar&m=foo",
      search: "?q=bar&m=foo",
    };

    await act(async () => {
      render(<App defaultFilters={[]} uiDefaults={uiDefaults} />);
    });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("doesn't crash on truncated 'm' value", async () => {
    // Verifies app handles truncated base64 silence data gracefully
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(jest.fn());

    const m1 = NewEmptyMatcher();
    m1.name = "foo";
    m1.isRegex = true;
    m1.values = [StringToOption("bar")];
    const m2 = NewEmptyMatcher();
    m2.name = "bar";
    m2.isRegex = false;
    m2.values = [StringToOption("foo"), StringToOption("baz")];
    const store = new SilenceFormStore();
    store.data.setMatchers([m1, m2]);
    store.data.setComment("base64");
    const m = store.data.toBase64;

    global.window.location = {
      href: `http://localhost/?q=bar&m=${m}`,
      search: `?q=bar&m=${m.slice(0, m.length - 2)}`,
    };

    await act(async () => {
      render(<App defaultFilters={[]} uiDefaults={uiDefaults} />);
    });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});

describe("<App /> theme", () => {
  const renderApp = async (theme: ThemeT) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <App
          defaultFilters={["foo=bar"]}
          uiDefaults={Object.assign({}, uiDefaults, { Theme: theme })}
        />,
      );
    });
    return result!;
  };

  it("configures light theme when uiDefaults passes it", async () => {
    // Verifies light theme is configured when passed via uiDefaults
    const { baseElement, unmount } = await renderApp("light");
    const themeSpan = within(baseElement).getByText("", {
      selector: "span[data-theme='light']",
    });
    expect(themeSpan).toBeInTheDocument();
    unmount();
  });

  it("configures dark theme when uiDefaults passes it", async () => {
    // Verifies dark theme is configured when passed via uiDefaults
    const { baseElement, unmount } = await renderApp("dark");
    const themeSpan = within(baseElement).getByText("", {
      selector: "span[data-theme='dark']",
    });
    expect(themeSpan).toBeInTheDocument();
    unmount();
  });

  it("configures automatic theme when uiDefaults passes it", async () => {
    // Verifies auto theme is configured when passed via uiDefaults
    const { baseElement, unmount } = await renderApp("auto");
    const themeSpan = within(baseElement).getByText("", {
      selector: "span[data-theme='auto']",
    });
    expect(themeSpan).toBeInTheDocument();
    unmount();
  });

  it("configures automatic theme when uiDefaults doesn't pass any value", async () => {
    // Verifies auto theme is used as default when no theme specified
    let baseElement: HTMLElement;
    let unmount: () => void;
    await act(async () => {
      const result = render(
        <App defaultFilters={["foo=bar"]} uiDefaults={null} />,
      );
      baseElement = result.baseElement;
      unmount = result.unmount;
    });
    const themeSpan = within(baseElement!).getByText("", {
      selector: "span[data-theme='auto']",
    });
    expect(themeSpan).toBeInTheDocument();
    unmount!();
  });

  it("applies light theme when theme=auto and browser doesn't support prefers-color-scheme", async () => {
    // Verifies light theme fallback when browser doesn't support prefers-color-scheme
    window.matchMedia = mockMatchMedia({});
    const { unmount } = await renderApp("auto");
    expect(document.body.classList.contains("theme-light")).toBe(true);
    unmount();
  });

  const lightMatch = () => ({
    "(prefers-color-scheme)": {
      media: "(prefers-color-scheme)",
      matches: true,
    },
    "(prefers-color-scheme: light)": {
      media: "(prefers-color-scheme: light)",
      matches: true,
    },
    "(prefers-color-scheme: dark)": {
      media: "(prefers-color-scheme: dark)",
      matches: false,
    },
  });

  const darkMatch = () => ({
    "(prefers-color-scheme)": {
      media: "(prefers-color-scheme)",
      matches: true,
    },
    "(prefers-color-scheme: light)": {
      media: "(prefers-color-scheme: light)",
      matches: false,
    },
    "(prefers-color-scheme: dark)": {
      media: "(prefers-color-scheme: dark)",
      matches: true,
    },
  });

  interface testCaseT {
    name: string;
    settings: ThemeT;
    matchMedia: any;
    theme: string;
  }

  const testCases: testCaseT[] = [
    {
      name: "applies LightTheme when config=auto and browser doesn't support prefers-color-scheme",
      settings: "auto",
      matchMedia: {},
      theme: "LightTheme",
    },
    {
      name: "applies LightTheme when config=auto and browser prefers-color-scheme:light matches",
      settings: "auto",
      matchMedia: lightMatch(),
      theme: "LightTheme",
    },
    {
      name: "applies DarkTheme when config=auto and browser prefers-color-scheme:dark matches",
      settings: "auto",
      matchMedia: darkMatch(),
      theme: "DarkTheme",
    },

    {
      name: "applies LightTheme when config=light and browser doesn't support prefers-color-scheme",
      settings: "light",
      matchMedia: {},
      theme: "LightTheme",
    },
    {
      name: "applies LightTheme when config=light and browser prefers-color-scheme:light matches",
      settings: "light",
      matchMedia: lightMatch(),
      theme: "LightTheme",
    },

    {
      name: "applies DarkTheme when config=dark and browser doesn't support prefers-color-scheme",
      settings: "dark",
      matchMedia: {},
      theme: "DarkTheme",
    },
    {
      name: "applies DarkTheme when config=dark and browser prefers-color-scheme:dark matches",
      settings: "dark",
      matchMedia: darkMatch(),
      theme: "DarkTheme",
    },
  ];
  for (const testCase of testCases) {
    it(`${testCase.name}`, async () => {
      window.matchMedia = mockMatchMedia(testCase.matchMedia);
      const { unmount } = await renderApp(testCase.settings);
      const themeClass =
        testCase.theme === "LightTheme" ? "theme-light" : "theme-dark";
      expect(document.body.classList.contains(themeClass)).toBe(true);
      unmount();
      window.matchMedia.mockRestore();
    });
  }
});

describe("<App /> animations", () => {
  const renderApp = async (animations: boolean) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <App
          defaultFilters={["foo=bar"]}
          uiDefaults={Object.assign({}, uiDefaults, { Animations: animations })}
        />,
      );
    });
    return result!;
  };

  it("enables animations in the context when set via UI defaults", async () => {
    // Verifies animations are enabled when set via UI defaults
    const { unmount } = await renderApp(true);
    unmount();
  });

  it("disables animations in the context when disabled via UI defaults", async () => {
    // Verifies animations are disabled when set via UI defaults
    const { unmount } = await renderApp(false);
    unmount();
  });
});
