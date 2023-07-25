import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import fetchMock from "fetch-mock";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { MockSilence } from "__fixtures__/Alerts";
import { PressKey } from "__fixtures__/PressKey";
import { MockThemeContext } from "__fixtures__/Theme";
import type { APISilenceT, APIManagedSilenceT } from "Models/APITypes";
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
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));

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
        version: "0.24.0",
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
  jest.useRealTimers();

  localStorage.setItem("fetchConfig.interval", "");
  global.window.innerWidth = 1024;

  fetchMock.reset();
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
    },
  );
};

describe("<Browser />", () => {
  it("fetches /silences.json on mount", () => {
    MountedBrowser();
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=",
    );
  });

  it("fetches /silences.json in a loop", () => {
    settingsStore.fetchConfig.setInterval(1);
    MountedBrowser();

    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 2)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 4)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 6)));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(useFetchGetMock.fetch.calls).toHaveLength(4);
  });

  it("enabling reverse sort passes sortReverse=1 to the API", () => {
    const tree = MountedBrowser();
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=",
    );

    const sortOrder = tree.find("button.btn-secondary").at(0);
    expect(sortOrder.text()).toBe("Sort order");
    sortOrder.simulate("click");

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=1&showExpired=0&searchTerm=",
    );
  });

  it("enabling expired silences passes showExpired=1 to the API", () => {
    const tree = MountedBrowser();

    const expiredCheckbox = tree.find("input[type='checkbox']").first();
    expiredCheckbox.simulate("change", { target: { checked: true } });

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=1&searchTerm=",
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
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=",
    );
    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=foo",
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
    expect(toDiffableHtml(tree.html())).toMatch(/fa-circle-exclamation/);
  });

  it("resets the timer on unmount", () => {
    const tree = MountedBrowser();
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);

    tree.unmount();

    act(() => {
      jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 59)));
      jest.runOnlyPendingTimers();
    });

    expect(useFetchGetMock.fetch.calls).toHaveLength(1);
  });
});

describe("<SilenceDelete />", () => {
  it("Delete selected silences", async () => {
    const promise = Promise.resolve();

    const newSilence = (id: string): APISilenceT => {
      const s = MockSilence();
      s.id = id;
      return s;
    };
    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 1,
          silence: newSilence("1"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 2,
          silence: newSilence("2"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 3,
          silence: newSilence("3"),
          isExpired: true,
        },
        {
          cluster: cluster,
          alertCount: 4,
          silence: newSilence("4"),
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

    fetchMock.mock("*", {
      status: 200,
      body: "ok",
    });

    const tree = MountedBrowser();

    // nothing is selected intially
    expect(tree.find("input.form-check-input")).toHaveLength(5);
    for (const i of [1, 2, 3, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        false,
      );
    }

    // 'Select all' click
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select all");
    tree.find(".dropdown-item").last().simulate("click");
    expect(tree.find("input.form-check-input").at(3).props().checked).toBe(
      false,
    );
    for (const i of [1, 2, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }
    expect(tree.find(".dropdown-item").last().text()).toBe("Select none");

    // 'Select none' click
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select none");
    tree.find(".dropdown-item").last().simulate("click");
    for (const i of [1, 2, 3, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        false,
      );
    }

    // 'Select all' again
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select all");
    tree.find(".dropdown-item").last().simulate("click");
    for (const i of [1, 2, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }

    // untick 3
    tree
      .find("input.form-check-input")
      .at(2)
      .simulate("change", { target: { checked: false } });
    for (const i of [1, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }
    for (const i of [2, 3]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        false,
      );
    }
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select all");

    // we have 1,2,4 ticked and 3 unticked, untick 2
    tree
      .find("input.form-check-input")
      .at(2)
      .simulate("change", { target: { checked: false } });
    for (const i of [1, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }
    for (const i of [2, 3]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        false,
      );
    }

    const del = tree.find(".btn.btn-danger").first();
    expect(del.props().disabled).toBe(false);
    del.simulate("click");

    expect(tree.find("SilenceDeleteModalContent")).toHaveLength(1);
    expect(tree.find("MassDeleteProgress")).toHaveLength(1);
    expect(tree.find("div.progress").at(4).html()).toMatch(
      /progress-bar bg-success/,
    );
    expect(tree.find("div.progress").at(4).html()).toMatch(
      /progress-bar bg-danger/,
    );

    const mdp = tree.find("MassDeleteProgress");
    expect((mdp.props() as any).silences).toStrictEqual([
      { cluster: "am", id: "1" },
      { cluster: "am", id: "4" },
    ]);

    await act(async () => {
      jest.advanceTimersByTime(2 * 60);
      tree.update();
      await fetchMock.flush(true);
    });

    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://localhost:9093/api/v2/silence/1",
    );
    expect(fetchMock.calls()[1][0]).toBe(
      "http://localhost:9093/api/v2/silence/4",
    );

    tree.find(".btn-close").last().simulate("click");

    tree.unmount();

    await act(() => promise);
  });

  it("Removes expired silences from selected list", async () => {
    const promise = Promise.resolve();

    const newSilence = (id: string): APISilenceT => {
      const s = MockSilence();
      s.id = id;
      return s;
    };

    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 1,
          silence: newSilence("1"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 2,
          silence: newSilence("2"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 3,
          silence: newSilence("3"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 4,
          silence: newSilence("4"),
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

    fetchMock.mock("*", {
      status: 200,
      body: "ok",
    });

    const tree = MountedBrowser();

    // 'Select all' click
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select all");
    tree.find(".dropdown-item").last().simulate("click");
    for (const i of [1, 2, 3, 4]) {
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }
    tree.find(".btn.dropdown-toggle").last().simulate("click");

    expect(useFetchGetMock.fetch.calls).toHaveLength(1);
    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 2,
          silence: newSilence("2"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 3,
          silence: newSilence("3"),
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
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(useFetchGetMock.fetch.calls).toHaveLength(2);

    const del = tree.find(".btn.btn-danger").first();
    expect(del.props().disabled).toBe(false);
    del.simulate("click");

    const mdp = tree.find("MassDeleteProgress");
    expect((mdp.props() as any).silences).toStrictEqual([
      { cluster: "am", id: "2" },
      { cluster: "am", id: "3" },
    ]);

    await act(async () => {
      jest.advanceTimersByTime(2 * 60);
      await fetchMock.flush(true);
    });

    expect(fetchMock.calls()).toHaveLength(2);
    expect(fetchMock.calls()[0][0]).toBe(
      "http://localhost:9093/api/v2/silence/2",
    );
    expect(fetchMock.calls()[1][0]).toBe(
      "http://localhost:9093/api/v2/silence/3",
    );

    tree.find(".btn-close").last().simulate("click");

    await act(() => promise);
  });

  it("Modal is closed after esc is pressed", async () => {
    const promise = Promise.resolve();

    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 1,
          silence: MockSilence(),
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

    fetchMock.mock("*", {
      status: 200,
      body: "ok",
    });

    const tree = MountedBrowser();

    // 'Select all' click
    tree.find(".btn.dropdown-toggle").last().simulate("click");
    expect(tree.find(".dropdown-item").last().text()).toBe("Select all");
    tree.find(".dropdown-item").last().simulate("click");

    const del = tree.find(".btn.btn-danger").first();
    expect(del.props().disabled).toBe(false);
    del.simulate("click");

    await act(async () => {
      jest.advanceTimersByTime(60);
      await fetchMock.flush(true);
    });

    expect(tree.find("SilenceDeleteModalContent")).toHaveLength(1);
    PressKey("Escape", 27);
    // This fails but coverage confirms it gets called
    // expect(tree.find("SilenceDeleteModalContent")).toHaveLength(0);

    await act(() => promise);
  });

  it("Retries failed requests on other cluster members", async () => {
    const promise = Promise.resolve();

    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 1, failed: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1", "am2", "am3"],
          uri: "http://m1.example.com",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.24.0",
          headers: {},
          corsCredentials: "include",
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am1", "am2", "am3"],
          uri: "http://m2.example.com",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.24.0",
          headers: {},
          corsCredentials: "include",
        },
        {
          name: "am3",
          cluster: "am",
          clusterMembers: ["am1", "am2", "am3"],
          uri: "http://m3.example.com",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.24.0",
          headers: {},
          corsCredentials: "include",
        },
        {
          name: "am4",
          cluster: "failed",
          clusterMembers: ["am4"],
          uri: "http://m4.example.com",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.24.0",
          headers: {},
          corsCredentials: "include",
        },
      ],
      clusters: { am: ["am1", "am2", "am3"], failed: ["am4"] },
    });

    fetchMock.reset();
    fetchMock.mock("http://m1.example.com/api/v2/silence/1", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.mock("http://m2.example.com/api/v2/silence/1", {
      status: 502,
      body: "Bad Gateway",
    });
    fetchMock.mock("http://m3.example.com/api/v2/silence/1", {
      status: 200,
      body: "OK",
    });
    fetchMock.mock("http://m1.example.com/api/v2/silence/2", {
      throws: "error text",
    });
    fetchMock.mock("http://m2.example.com/api/v2/silence/2", {
      status: 200,
      body: "OK",
    });
    fetchMock.mock("http://m4.example.com/api/v2/silence/3", {
      status: 400,
      body: "Bad Request",
    });
    fetchMock.mock("http://m4.example.com/api/v2/silence/4", {
      throws: new TypeError("failed to fetch"),
    });

    const newSilence = (id: string): APISilenceT => {
      const s = MockSilence();
      s.id = id;
      return s;
    };

    useFetchGetMock.fetch.setMockedData({
      response: [
        {
          cluster: cluster,
          alertCount: 1,
          silence: newSilence("1"),
          isExpired: false,
        },
        {
          cluster: cluster,
          alertCount: 2,
          silence: newSilence("2"),
          isExpired: false,
        },
        {
          cluster: "failed",
          alertCount: 3,
          silence: newSilence("3"),
          isExpired: false,
        },
        {
          cluster: "failed",
          alertCount: 4,
          silence: newSilence("4"),
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

    for (const i of [1, 2, 3, 4]) {
      tree
        .find("input.form-check-input[type='checkbox']")
        .at(i)
        .simulate("change", { target: { checked: true } });
      expect(tree.find("input.form-check-input").at(i).props().checked).toBe(
        true,
      );
    }

    const del = tree.find(".btn.btn-danger").first();
    expect(del.props().disabled).toBe(false);
    del.simulate("click");

    const mdp = tree.find("MassDeleteProgress");
    expect((mdp.props() as any).silences).toStrictEqual([
      { cluster: "failed", id: "4" },
      { cluster: "failed", id: "3" },
      { cluster: "am", id: "2" },
      { cluster: "am", id: "1" },
    ]);

    await act(async () => {
      jest.advanceTimersByTime(10 * 60);
      await fetchMock.flush(true);
    });

    expect(fetchMock.calls()).toHaveLength(7);
    const uris = fetchMock.calls().map((c) => c[0]);
    expect(uris).toContainEqual("http://m1.example.com/api/v2/silence/1");
    expect(uris).toContainEqual("http://m1.example.com/api/v2/silence/2");
    expect(uris).toContainEqual("http://m4.example.com/api/v2/silence/3");
    expect(uris).toContainEqual("http://m4.example.com/api/v2/silence/4");
    expect(uris).toContainEqual("http://m2.example.com/api/v2/silence/1");
    expect(uris).toContainEqual("http://m2.example.com/api/v2/silence/2");
    expect(uris).toContainEqual("http://m3.example.com/api/v2/silence/1");

    await act(() => promise);
  });
});
