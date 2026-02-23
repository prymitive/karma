import { act } from "react-dom/test-utils";

import { render, fireEvent } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

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

  fetchMock.mockReset();
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

const renderBrowser = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <Browser
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
      />
    </ThemeContext.Provider>,
  );
};

describe("<Browser />", () => {
  it("fetches /silences.json on mount", () => {
    renderBrowser();
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=",
    );
  });

  it("fetches /silences.json in a loop", () => {
    settingsStore.fetchConfig.setInterval(1);
    renderBrowser();

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
    const { container } = renderBrowser();
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=",
    );

    const sortOrder = container.querySelectorAll("button.btn-secondary")[0];
    expect(sortOrder.textContent).toBe("Sort order");
    fireEvent.click(sortOrder);

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=1&showExpired=0&searchTerm=",
    );
  });

  it("enabling expired silences passes showExpired=1 to the API", () => {
    const { container } = renderBrowser();

    const expiredCheckbox = container.querySelector("input[type='checkbox']");
    act(() => {
      fireEvent.click(expiredCheckbox!);
    });

    expect(useFetchGetMock.fetch.calls[1]).toBe(
      "./silences.json?sortReverse=0&showExpired=1&searchTerm=",
    );
  });

  it("entering a search phrase passes searchTerm=foo to the API", () => {
    const { container } = renderBrowser();

    const input = container.querySelector("input[type='text']");
    fireEvent.change(input!, { target: { value: "foo" } });

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
    const { container } = renderBrowser();
    expect(container.innerHTML).toMatch(/fa-spinner/);
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
    const { container } = renderBrowser();
    expect(container.innerHTML).toMatch(/fa-spinner/);
    expect(container.innerHTML).toMatch(/text-danger/);
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
    const { container } = renderBrowser();
    expect(container.innerHTML).toMatch(/Nothing to show/);
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
    const { container } = renderBrowser();
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(1);
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
    const { container } = renderBrowser();
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);
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
    const { container } = renderBrowser();
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(4);
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
    const { container } = renderBrowser();

    const pageItems = container.querySelectorAll("li.page-item");
    expect(pageItems[1].classList.contains("active")).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);

    const pageLinks = container.querySelectorAll(".page-link");
    fireEvent.click(pageLinks[3]);
    expect(
      container
        .querySelectorAll("li.page-item")[2]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(1);
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
    const { container } = renderBrowser();

    expect(
      container
        .querySelectorAll("li.page-item")[1]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);

    const paginator = container.querySelector(".components-pagination");
    fireEvent.focus(paginator!);

    PressKey("ArrowRight", 39);
    expect(
      container
        .querySelectorAll("li.page-item")[2]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);

    PressKey("ArrowRight", 39);
    expect(
      container
        .querySelectorAll("li.page-item")[3]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(1);

    PressKey("ArrowRight", 39);
    expect(
      container
        .querySelectorAll("li.page-item")[3]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(1);

    PressKey("ArrowLeft", 37);
    expect(
      container
        .querySelectorAll("li.page-item")[2]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);

    PressKey("ArrowLeft", 37);
    expect(
      container
        .querySelectorAll("li.page-item")[1]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);

    PressKey("ArrowLeft", 37);
    expect(
      container
        .querySelectorAll("li.page-item")[1]
        .classList.contains("active"),
    ).toBe(true);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(6);
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
    const { container } = renderBrowser();

    expect(
      container
        .querySelectorAll("li.page-item")[1]
        .classList.contains("active"),
    ).toBe(true);
    const pageLinks = container.querySelectorAll(".page-link");
    fireEvent.click(pageLinks[3]);
    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(1);
    expect(
      container
        .querySelectorAll("li.page-item")[3]
        .classList.contains("active"),
    ).toBe(true);

    useFetchGetMock.fetch.setMockedData({
      response: MockSilenceList(8),
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    fireEvent.click(container.querySelector("button.btn-secondary")!);

    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(2);
    expect(
      container
        .querySelectorAll("li.page-item")[2]
        .classList.contains("active"),
    ).toBe(true);

    useFetchGetMock.fetch.setMockedData({
      response: [],
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    fireEvent.click(container.querySelector("button.btn-secondary")!);

    expect(
      container.querySelectorAll(".components-managed-silence"),
    ).toHaveLength(0);
    expect(container.innerHTML).toMatch(/Nothing to show/);
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
    const { container } = renderBrowser();

    expect(container.innerHTML).toMatch(/fa-circle-exclamation/);
  });

  it("resets the timer on unmount", () => {
    const { unmount } = renderBrowser();
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);

    unmount();

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

    fetchMock.route("*", {
      status: 200,
      body: "ok",
    });

    const { container, unmount } = renderBrowser();

    // nothing is selected initially
    const checkboxes = container.querySelectorAll("input.form-check-input");
    expect(checkboxes).toHaveLength(5);
    for (const i of [1, 2, 3, 4]) {
      expect((checkboxes[i] as HTMLInputElement).checked).toBe(false);
    }

    // 'Select all' click
    const dropdownToggles = container.querySelectorAll(".btn.dropdown-toggle");
    fireEvent.click(dropdownToggles[dropdownToggles.length - 1]);
    const dropdownItems = container.querySelectorAll(".dropdown-item");
    expect(dropdownItems[dropdownItems.length - 1].textContent).toBe(
      "Select all",
    );
    fireEvent.click(dropdownItems[dropdownItems.length - 1]);

    const del = container.querySelector(".btn.btn-danger");
    expect((del as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(del!);

    expect(container.innerHTML).toMatch(/progress-bar/);

    await act(async () => {
      jest.advanceTimersByTime(2 * 60);
      await fetchMock.callHistory.flush(true);
    });

    expect(fetchMock.callHistory.calls()).toHaveLength(3);

    const closeBtn = container.querySelector(".btn-close");
    if (closeBtn) fireEvent.click(closeBtn);

    unmount();

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

    fetchMock.route("*", {
      status: 200,
      body: "ok",
    });

    const { container } = renderBrowser();

    // 'Select all' click
    const dropdownToggles = container.querySelectorAll(".btn.dropdown-toggle");
    fireEvent.click(dropdownToggles[dropdownToggles.length - 1]);
    const dropdownItems = container.querySelectorAll(".dropdown-item");
    expect(dropdownItems[dropdownItems.length - 1].textContent).toBe(
      "Select all",
    );
    fireEvent.click(dropdownItems[dropdownItems.length - 1]);
    fireEvent.click(dropdownToggles[dropdownToggles.length - 1]);

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

    const del = container.querySelector(".btn.btn-danger");
    expect((del as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(del!);

    await act(async () => {
      jest.advanceTimersByTime(2 * 60);
      await fetchMock.callHistory.flush(true);
    });

    expect(fetchMock.callHistory.calls()).toHaveLength(2);

    const closeBtn = container.querySelector(".btn-close");
    if (closeBtn) fireEvent.click(closeBtn);

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

    fetchMock.route("*", {
      status: 200,
      body: "ok",
    });

    const { container } = renderBrowser();

    // 'Select all' click
    const dropdownToggles = container.querySelectorAll(".btn.dropdown-toggle");
    fireEvent.click(dropdownToggles[dropdownToggles.length - 1]);
    const dropdownItems = container.querySelectorAll(".dropdown-item");
    expect(dropdownItems[dropdownItems.length - 1].textContent).toBe(
      "Select all",
    );
    fireEvent.click(dropdownItems[dropdownItems.length - 1]);

    const del = container.querySelector(".btn.btn-danger");
    expect((del as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(del!);

    await act(async () => {
      jest.advanceTimersByTime(60);
      await fetchMock.callHistory.flush(true);
    });

    PressKey("Escape", 27);

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

    fetchMock.mockReset();
    fetchMock.route("http://m1.example.com/api/v2/silence/1", {
      throws: new TypeError("failed to fetch"),
    });
    fetchMock.route("http://m2.example.com/api/v2/silence/1", {
      status: 502,
      body: "Bad Gateway",
    });
    fetchMock.route("http://m3.example.com/api/v2/silence/1", {
      status: 200,
      body: "OK",
    });
    fetchMock.route("http://m1.example.com/api/v2/silence/2", {
      throws: "error text",
    });
    fetchMock.route("http://m2.example.com/api/v2/silence/2", {
      status: 200,
      body: "OK",
    });
    fetchMock.route("http://m4.example.com/api/v2/silence/3", {
      status: 400,
      body: "Bad Request",
    });
    fetchMock.route("http://m4.example.com/api/v2/silence/4", {
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

    const { container } = renderBrowser();

    const checkboxes = container.querySelectorAll(
      "input.form-check-input[type='checkbox']",
    );
    for (const i of [1, 2, 3, 4]) {
      act(() => {
        fireEvent.click(checkboxes[i]);
      });
    }

    const del = container.querySelector(".btn.btn-danger");
    expect((del as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(del!);

    await act(async () => {
      jest.advanceTimersByTime(10 * 60);
      await fetchMock.callHistory.flush(true);
    });

    expect(fetchMock.callHistory.calls()).toHaveLength(7);
    const uris = fetchMock.callHistory.calls().map((c) => c?.url);
    expect(uris).toContainEqual("http://m1.example.com/api/v2/silence/1");
    expect(uris).toContainEqual("http://m1.example.com/api/v2/silence/2");
    expect(uris).toContainEqual("http://m4.example.com/api/v2/silence/3");
    expect(uris).toContainEqual("http://m4.example.com/api/v2/silence/4");
    expect(uris).toContainEqual("http://m2.example.com/api/v2/silence/1");
    expect(uris).toContainEqual("http://m2.example.com/api/v2/silence/2");
    expect(uris).toContainEqual("http://m3.example.com/api/v2/silence/1");

    await act(() => promise);
  });

  it("displays errors when delete requests fail on all cluster members", async () => {
    // Verifies that MassDelete shows error messages when all retries fail
    const promise = Promise.resolve();

    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 1, failed: 0 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://m1.example.com",
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

    fetchMock.mockReset();
    fetchMock.route("http://m1.example.com/api/v2/silence/1", {
      status: 500,
      body: "Internal Server Error",
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
      ],
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const { container } = renderBrowser();

    const checkboxes = container.querySelectorAll(
      "input.form-check-input[type='checkbox']",
    );
    act(() => {
      fireEvent.click(checkboxes[1]);
    });

    const del = container.querySelector(".btn.btn-danger");
    fireEvent.click(del!);

    await act(async () => {
      jest.advanceTimersByTime(10 * 60);
      await fetchMock.callHistory.flush(true);
    });

    const errorDisplay = document.body.querySelector(".bg-dark.text-white");
    expect(errorDisplay).toBeInTheDocument();
    expect(errorDisplay?.querySelector("samp")).toBeInTheDocument();

    await act(() => promise);
  });
});
