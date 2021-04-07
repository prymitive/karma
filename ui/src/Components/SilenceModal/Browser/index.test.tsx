import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { MockSilence } from "__fixtures__/Alerts";
import { PressKey } from "__fixtures__/PressKey";
import { MockThemeContext } from "__fixtures__/Theme";
import { APISilenceT, APIManagedSilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import Browser from ".";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let settingsStore: Settings;
let cluster: string;
let silence: APISilenceT;

declare let global: any;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  settingsStore = new Settings(null);
  cluster = "am";
  silence = MockSilence();

  settingsStore.fetchConfig.setInterval(30);

  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 1 },
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
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  clear();

  localStorage.setItem("fetchConfig.interval", "");
  global.window.innerWidth = 1024;
});

const MockSilenceList = (count: number): APIManagedSilenceT[] => {
  const silences: APIManagedSilenceT[] = [];
  for (let index = 1; index <= count; index++) {
    const silence = MockSilence();
    silence.id = `silence${index}`;
    silences.push({
      cluster: cluster,
      alertCount: 123,
      silence: silence,
      isExpired: false,
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
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );
  });

  it("fetches /silences.json in a loop", () => {
    settingsStore.fetchConfig.setInterval(1);
    MountedBrowser();

    advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 2)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 4)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 6)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(useFetchGetMock.fetch.calls).toHaveLength(4);
  });

  it("enabling reverse sort passes sortReverse=1 to the API", () => {
    const tree = MountedBrowser();
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );

    const sortOrder = tree.find("button.btn-secondary").at(0);
    expect(sortOrder.text()).toBe("Sort order");
    sortOrder.simulate("click");

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=1&showExpired=0&searchTerm="
    );
  });

  it("enabling expired silences passes showExpired=1 to the API", () => {
    const tree = MountedBrowser();

    const expiredCheckbox = tree.find("input[type='checkbox']");
    expiredCheckbox.simulate("change", { target: { checked: true } });

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=1&searchTerm="
    );
  });

  it("entering a search phrase passes searchTerm=foo to the API", () => {
    const tree = MountedBrowser();

    const input = tree.find("input[type='text']").at(0);
    input.simulate("change", { target: { value: "foo" } });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(useFetchGetMock.fetch.calls).toHaveLength(2);
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );
    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=foo"
    );
  });

  it("renders loading placeholder before fetch finishes", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-spinner/);
  });

  it("loading placeholder has text-danger class when retrying fetches", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: true,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-spinner .+ text-danger/);
  });

  it("renders empty placeholder after fetch with zero results", () => {
    useFetchGetMock.fetch.setMockedData({
      response: [],
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/Nothing to show/);
  });

  it("renders silences after successful fetch", () => {
    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
          isExpired: false,
        },
      ],
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(1);
  });

  it("renders only first 6 silences on desktop", () => {
    global.window.innerWidth = 1024;
    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(7),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(6);
  });

  it("renders only first 6 silences on mobile", () => {
    global.window.innerWidth = 500;
    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(7),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();
    expect(tree.find("ManagedSilence")).toHaveLength(4);
  });

  it("renders last silence after page change", () => {
    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(7),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
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
    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(13),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();

    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    const paginator = tree.find(".components-pagination").at(0);
    paginator.simulate("focus");

    PressKey("ArrowRight", 39);
    tree.update();
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey("ArrowRight", 39);
    tree.update();
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(1);

    PressKey("ArrowRight", 39);
    tree.update();
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(1);

    PressKey("ArrowLeft", 37);
    tree.update();
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey("ArrowLeft", 37);
    tree.update();
    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);

    PressKey("ArrowLeft", 37);
    tree.update();
    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    expect(tree.find("ManagedSilence")).toHaveLength(6);
  });

  it("resets pagination to last page on truncation", () => {
    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(13),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();

    expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
    const pageLink = tree.find(".page-link").at(3);
    pageLink.simulate("click");
    tree.update();
    expect(tree.find("ManagedSilence")).toHaveLength(1);
    expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);

    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(8),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    tree.find("button.btn-secondary").simulate("click");

    expect(tree.find("ManagedSilence")).toHaveLength(2);
    expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);

    useFetchGetMock.fetch.setMockedData({
      response: [],
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    tree.find("button.btn-secondary").simulate("click");

    expect(tree.find("ManagedSilence")).toHaveLength(0);
    expect(tree.find("Placeholder")).toHaveLength(1);
  });

  it("renders error after failed fetch", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "fake failure",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedBrowser();

    expect(tree.find("FetchError")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/exclamation-circle/);
  });

  it("resets the timer on unmount", () => {
    const tree = MountedBrowser();
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);

    tree.unmount();

    act(() => {
      advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 59)));
      jest.runOnlyPendingTimers();
    });

    expect(useFetchGetMock.fetch.calls).toHaveLength(1);
  });
});
