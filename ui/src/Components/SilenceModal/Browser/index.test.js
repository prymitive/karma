import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { MockThemeContext } from "__mocks__/Theme";
import { PressKey } from "__mocks__/KeyPress";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { useFetchGet } from "Hooks/useFetchGet";
import { Browser } from ".";

let alertStore;
let silenceFormStore;
let settingsStore;
let cluster;
let silence;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  settingsStore = new Settings();
  cluster = "am";
  silence = MockSilence();

  settingsStore.fetchConfig.config.interval = 30;

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://example.com",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  clear();
  useFetchGet.mockReset();

  localStorage.setItem("fetchConfig.interval", "");
  global.window.innerWidth = 1024;
});

const MockOnDeleteModalClose = jest.fn();

const MockSilenceList = (count) => {
  let silences = [];
  for (var index = 1; index <= count; index++) {
    const silence = MockSilence();
    silence.id = `silence${index}`;
    silences.push({
      cluster: cluster,
      alertCount: 123,
      silence: silence,
    });
  }
  return silences;
};

const MountedBrowser = () => {
  return mount(
    <Browser
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      onDeleteModalClose={MockOnDeleteModalClose}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<Browser />", () => {
  it("fetches /silences.json on mount", () => {
    MountedBrowser();
    expect(useFetchGet.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );
  });

  it("fetches /silences.json in a loop", () => {
    settingsStore.fetchConfig.config.interval = 1;
    MountedBrowser();

    advanceTo(moment.utc([2000, 0, 1, 0, 30, 2]));
    act(() => jest.runOnlyPendingTimers());

    advanceTo(moment.utc([2000, 0, 1, 0, 30, 4]));
    act(() => jest.runOnlyPendingTimers());

    advanceTo(moment.utc([2000, 0, 1, 0, 30, 6]));
    act(() => jest.runOnlyPendingTimers());

    expect(useFetchGet.fetch.calls).toHaveLength(4);
  });

  it("enabling reverse sort passes sortReverse=1 to the API", () => {
    const tree = MountedBrowser();
    expect(useFetchGet.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );

    const sortOrder = tree.find("button.btn-secondary").at(0);
    expect(sortOrder.text()).toBe("Sort order");
    sortOrder.simulate("click");

    expect(useFetchGet.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=1&showExpired=0&searchTerm="
    );
  });

  it("enabling expired silences passes showExpired=1 to the API", () => {
    const tree = MountedBrowser();

    const expiredCheckbox = tree.find("input[type='checkbox']");
    expiredCheckbox.simulate("change", { target: { checked: true } });

    expect(useFetchGet.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=1&searchTerm="
    );
  });

  it("entering a search phrase passes searchTerm=foo to the API", () => {
    const tree = MountedBrowser();

    const input = tree.find("input[type='text']").at(0);
    input.simulate("change", { target: { value: "foo" } });

    act(() => jest.advanceTimersByTime(1000));
    expect(useFetchGet.fetch.calls).toHaveLength(2);
    expect(useFetchGet.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );
    expect(useFetchGet.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=foo"
    );
  });

  it("renders loading placeholder before fetch finishes", () => {
    useFetchGet.mockReturnValue({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: false,
    });
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-spinner/);
  });

  it("renders empty placeholder after fetch with zero results", () => {
    useFetchGet.mockReturnValue({
      response: [],
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/Nothing to show/);
  });

  it("renders silences after successful fetch", () => {
    useFetchGet.mockReturnValue({
      response: [
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
        },
      ],
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(1);
  });

  it("renders only first 6 silences on desktop", () => {
    global.window.innerWidth = 1024;
    useFetchGet.mockReturnValue({
      response: MockSilenceList(7),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(6);
  });

  it("renders only first 6 silences on mobile", () => {
    global.window.innerWidth = 500;
    useFetchGet.mockReturnValue({
      response: MockSilenceList(7),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(4);
  });

  it("renders last silence after page change", () => {
    useFetchGet.mockReturnValue({
      response: MockSilenceList(7),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();

    tree.update();
    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    const pageLink = tree.find(".page-link").at(3);
    pageLink.simulate("click");
    tree.update();
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(1);
  });

  it("renders next/previous page after arrow key press", () => {
    useFetchGet.mockReturnValue({
      response: MockSilenceList(13),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();

    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    const paginator = tree.find(".components-pagination").at(0);
    paginator.simulate("focus");

    PressKey(paginator, "ArrowRight", 39);
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey(paginator, "ArrowRight", 39);
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(1);

    PressKey(paginator, "ArrowRight", 39);
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(1);

    PressKey(paginator, "ArrowLeft", 37);
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey(paginator, "ArrowLeft", 37);
    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey(paginator, "ArrowLeft", 37);
    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);
  });

  it("resets pagination to last page on truncation", () => {
    useFetchGet.mockReturnValue({
      response: MockSilenceList(13),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();

    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    const pageLink = tree.find(".page-link").at(3);
    pageLink.simulate("click");
    tree.update();
    expect(tree.find("ManagedSilence")).toHaveLength(1);
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);

    useFetchGet.mockReturnValue({
      response: MockSilenceList(8),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    tree.find("button.btn-secondary").simulate("click");

    expect(tree.find("ManagedSilence")).toHaveLength(2);
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);

    useFetchGet.mockReturnValue({
      response: [],
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    tree.find("button.btn-secondary").simulate("click");

    expect(tree.find("ManagedSilence")).toHaveLength(0);
    expect(tree.find("Placeholder")).toHaveLength(1);
  });

  it("renders error after failed fetch", () => {
    useFetchGet.mockReturnValue({
      response: null,
      error: "fake failure",
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedBrowser();

    expect(tree.find("FetchError")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/exclamation-circle/);
  });

  it("resets the timer on unmount", () => {
    const tree = MountedBrowser();
    expect(useFetchGet.fetch.calls).toHaveLength(1);

    tree.unmount();

    advanceTo(moment.utc([2000, 0, 1, 0, 30, 59]));
    act(() => jest.runOnlyPendingTimers());

    expect(useFetchGet.fetch.calls).toHaveLength(1);
  });
});
