import React from "react";
import renderer from "react-test-renderer";

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

describe("<Fetcher />", () => {
  it("renders correctly with 'label=value' filter", () => {
    const tree = renderer
      .create(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />)
      .toJSON();

    expect(tree.props["data-filters"]).toBe("label=value");
    expect(tree.props["data-interval"]).toBe(30);
  });

  it("re-renders on fetch interval change", () => {
    const fetcher = renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );

    expect(fetcher.toJSON().props["data-interval"]).toBe(30);
    settingsStore.fetchConfig.config.interval = 60;
    expect(fetcher.toJSON().props["data-interval"]).toBe(60);
  });

  it("re-renders on filters change", () => {
    const fetcher = renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );

    expect(fetcher.toJSON().props["data-filters"]).toBe("label=value");
    alertStore.filters.values = [];
    expect(fetcher.toJSON().props["data-filters"]).toBe("");
  });

  it("calls alertStore.fetchWithThrottle on mount", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");

    renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls alertStore.fetchWithThrottle again after interval change", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");

    renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );
    settingsStore.fetchConfig.config.interval = 60;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("calls alertStore.fetchWithThrottle again after filter change", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");

    renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );
    alertStore.filters.values = [];

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps calling alertStore.fetchWithThrottle after running pending timers", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");

    renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    jest.runOnlyPendingTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("internal timer is armed after render", () => {
    const fetcher = renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );
    const instance = fetcher.getInstance();
    expect(instance.timer).toBeGreaterThanOrEqual(0);
  });

  it("internal timer is null after unmount", () => {
    const fetcher = renderer.create(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
    );
    const instance = fetcher.getInstance();
    instance.componentWillUnmount();
    expect(instance.timer).toBeNull();
  });
});
