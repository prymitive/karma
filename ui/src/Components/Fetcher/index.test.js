import React from "react";

import { mount } from "enzyme";

import { advanceTo, advanceBy, clear } from "jest-date-mock";

import { EmptyAPIResponse } from "__mocks__/Fetch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

import { Fetcher } from ".";

let alertStore;
let settingsStore;
let fetchSpy;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  advanceTo(new Date(2000, 1, 1, 0, 0, 0));

  alertStore = new AlertStore(["label=value"]);
  fetchSpy = jest
    .spyOn(alertStore, "fetchWithThrottle")
    .mockImplementation(() => {});

  settingsStore = new Settings();
  settingsStore.fetchConfig.config.interval = 30;

  jest.spyOn(window, "requestAnimationFrame").mockImplementation(cb => cb());
});

afterEach(() => {
  window.requestAnimationFrame.mockRestore();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clear();
});

const MockEmptyAPIResponseWithoutFilters = () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetch.mockResponse(JSON.stringify(response));
};

const MountedFetcher = () => {
  return mount(
    <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
  );
};

const FetcherSpan = (label, interval, sortOrder) =>
  `<span data-filters="${label}" data-interval="${interval}" data-grid-sort-order="${sortOrder}"></span>`;

describe("<Fetcher />", () => {
  it("renders correctly with 'label=value' filter", () => {
    const tree = MountedFetcher();
    expect(tree.html()).toBe(FetcherSpan("label=value", 30, "default"));
  });

  it("re-renders on fetch interval change", () => {
    const tree = MountedFetcher();
    expect(tree.html()).toBe(FetcherSpan("label=value", 30, "default"));
    settingsStore.fetchConfig.config.interval = 60;
    expect(tree.html()).toBe(FetcherSpan("label=value", 60, "default"));
  });

  it("changing interval changes how often fetch is called", () => {
    settingsStore.fetchConfig.config.interval = 1;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    settingsStore.fetchConfig.config.interval = 600;

    advanceBy(3 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(32 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(62 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(602 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("re-renders on filters change", () => {
    MockEmptyAPIResponseWithoutFilters();
    const tree = MountedFetcher();
    expect(tree.html()).toBe(FetcherSpan("label=value", 30, "default"));
    alertStore.filters.values = [];
    expect(tree.html()).toBe(FetcherSpan("", 30, "default"));
  });

  it("calls alertStore.fetchWithThrottle on mount", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls alertStore.fetchWithThrottle again after interval change", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    settingsStore.fetchConfig.config.interval = 60;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("calls alertStore.fetchWithThrottle again after filter change", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    alertStore.filters.values = [];
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps calling alertStore.fetchWithThrottle every minute", () => {
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    advanceBy(62 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(62 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    advanceBy(62 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("calls alertStore.fetchWithThrottle with empty sort arguments when sortOrder=default", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.default.value;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    settingsStore.gridConfig.config.reverseSort = false;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("disabled", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    settingsStore.gridConfig.config.reverseSort = true;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("disabled", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.startsAt.value;
    settingsStore.gridConfig.config.reverseSort = false;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("startsAt", "", "0");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.startsAt.value;
    settingsStore.gridConfig.config.reverseSort = true;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("startsAt", "", "1");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=cluster reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "cluster";
    settingsStore.gridConfig.config.reverseSort = false;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("label", "cluster", "0");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=job reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "job";
    settingsStore.gridConfig.config.reverseSort = true;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("label", "job", "1");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=instance reverseSort=null", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "instance";
    settingsStore.gridConfig.config.reverseSort = null;
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("label", "instance", "");
  });

  it("internal timer is armed after render", () => {
    const tree = MountedFetcher();
    const instance = tree.instance();
    expect(instance.timer).toBeGreaterThanOrEqual(0);
  });

  it("internal timer is null after unmount", () => {
    const tree = MountedFetcher();
    const instance = tree.instance();
    instance.componentWillUnmount();
    expect(instance.timer).toBeNull();
  });

  it("doesn't fetch on mount when paused", () => {
    alertStore.status.pause();
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("doesn't fetch on update when paused", () => {
    alertStore.status.pause();
    const tree = MountedFetcher();
    tree.instance().componentDidUpdate();
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("fetches on update when resumed", () => {
    alertStore.status.pause();
    const tree = MountedFetcher();
    alertStore.status.resume();
    tree.instance().componentDidUpdate();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches on resume", () => {
    alertStore.status.pause();
    MountedFetcher();
    alertStore.status.resume();
    advanceBy(2 * 1000);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
