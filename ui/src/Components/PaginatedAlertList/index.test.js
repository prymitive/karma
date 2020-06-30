import React from "react";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import { AlertStore } from "Stores/AlertStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { useFetchDelete } from "Hooks/useFetchDelete";
import { PaginatedAlertList } from ".";

let alertStore;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));
  jest.useFakeTimers();

  alertStore = new AlertStore([]);

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        uri: "http://localhost:9093",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
        clusterMembers: ["am1"],
      },
    ],
    clusters: { am: ["am1"] },
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
  useFetchDelete.mockReset();
  clear();
  document.body.className = "";
});

describe("<PaginatedAlertList />", () => {
  it("renders Placeholder while loading preview", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: false,
    });
    const tree = mount(
      <PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />
    );
    expect(tree.find("Placeholder")).toHaveLength(1);
  });

  it("renders LabelSetList with StaticLabel on mount", () => {
    const tree = mount(
      <PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />
    );
    expect(tree.find("LabelSetList")).toHaveLength(1);
    expect(tree.find("StaticLabel")).toHaveLength(3);
  });

  it("renders empty LabelSetList with empty response", () => {
    useFetchGet.fetch.setMockedData({
      response: EmptyAPIResponse(),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = mount(
      <PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />
    );
    expect(tree.find("LabelSetList")).toHaveLength(1);
    expect(tree.find("StaticLabel")).toHaveLength(0);
  });

  it("fetches affected alerts on mount", () => {
    mount(<PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />);
    expect(useFetchGet).toHaveBeenCalled();
  });

  it("renders StaticLabel after fetch", () => {
    const tree = mount(
      <PaginatedAlertList
        alertStore={alertStore}
        filters={["foo=bar"]}
        title="Affected alerts"
      />
    );
    expect(tree.text()).toMatch(/Affected alerts/);
    expect(tree.find("StaticLabel")).toHaveLength(3);
  });

  it("handles empty grid response correctly", () => {
    useFetchGet.fetch.setMockedData({
      response: EmptyAPIResponse(),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = mount(
      <PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />
    );
    expect(tree.text()).toMatch(/No alerts matched/);
  });

  it("renders FetchError on failed preview fetch", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
    });
    const tree = mount(
      <PaginatedAlertList alertStore={alertStore} filters={["foo=bar"]} />
    );
    expect(tree.find("FetchError")).toHaveLength(1);
  });
});
