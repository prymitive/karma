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
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
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

const FetcherSpan = (label, interval) =>
  `<span data-filters="${label}" data-interval="${interval}"></span>`;

describe("<Fetcher />", () => {
  it("renders correctly with 'label=value' filter", () => {
    const tree = MountedFetcher();
    expect(tree.html()).toBe(FetcherSpan("label=value", 30));
  });

  it("re-renders on fetch interval change", () => {
    const tree = MountedFetcher();
    expect(tree.html()).toBe(FetcherSpan("label=value", 30));
    settingsStore.fetchConfig.config.interval = 60;
    expect(tree.html()).toBe(FetcherSpan("label=value", 60));
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
    expect(tree.html()).toBe(FetcherSpan("label=value", 30));
    alertStore.filters.values = [];
    expect(tree.html()).toBe(FetcherSpan("", 30));
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
});
