import React from "react";

import { mount } from "enzyme";

import { EmptyAPIResponse } from "__mocks__/Fetch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

import { Fetcher } from ".";

beforeAll(() => {
  jest.useFakeTimers();
});

let alertStore;
let settingsStore;

beforeEach(() => {
  fetch.mockResponse(JSON.stringify(EmptyAPIResponse()));

  alertStore = new AlertStore(["label=value"]);
  settingsStore = new Settings();
});

afterEach(() => {
  jest.clearAllTimers();

  global.fetch.mockRestore();
});

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

  it("re-renders on filters change", () => {
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
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    alertStore.filters.values = [];
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps calling alertStore.fetchWithThrottle after running pending timers", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
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
