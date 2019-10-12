import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Browser } from ".";

let alertStore;
let silenceFormStore;
let cluster;
let silence;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://example.com",
        error: "",
        version: "0.15.3",
        headers: {}
      }
    ],
    clusters: { am: ["am1"] }
  };

  fetch.resetMocks();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
  clear();
});

const MountedBrowser = () => {
  return mount(
    <Browser alertStore={alertStore} silenceFormStore={silenceFormStore} />
  );
};

describe("<Browser />", () => {
  it("fetches /silences.json on mount", async () => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          silence: silence
        }
      ])
    );
    const tree = MountedBrowser();
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm="
    );
  });

  it("enabling reverse sort passes sortReverse=1 to the API", async () => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          silence: silence
        }
      ])
    );
    const tree = MountedBrowser();

    const sortOrder = tree.find("button.btn-outline-secondary").at(0);
    expect(sortOrder.text()).toBe("Sort order");
    sortOrder.simulate("click");

    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe(
      "./silences.json?sortReverse=1&showExpired=0&searchTerm="
    );
  });

  it("enabling expired silences passes showExpired=1 to the API", async () => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          silence: silence
        }
      ])
    );
    const tree = MountedBrowser();

    const expiredCheckbox = tree.find("input[type='checkbox']");
    expiredCheckbox.simulate("change", { target: { checked: true } });

    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe(
      "./silences.json?sortReverse=0&showExpired=1&searchTerm="
    );
  });

  it("entering a search phrase passes searchTerm=foo to the API", async () => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();

    const input = tree.find("input[type='text']").at(0);
    input.simulate("change", { target: { value: "foo" } });

    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe(
      "./silences.json?sortReverse=0&showExpired=0&searchTerm=foo"
    );
  });

  it("renders loading placeholder before fetch finishes", async () => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-spinner/);
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
  });

  it("renders empty placeholder after fetch with zero results", async () => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/Nothing to show/);
  });

  it("renders silences after successful fetch", async () => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          silence: silence
        }
      ])
    );
    const tree = MountedBrowser();
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("ManagedSilence")).toHaveLength(1);
  });

  it("renders error after failed fetch", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.mockReject("fake failure");
    const tree = MountedBrowser();
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("FetchError")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/exclamation-circle/);
  });

  it("resets the timer on unmount", async () => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    await expect(tree.instance().dataSource.fetch).resolves.toBeUndefined();

    expect(tree.instance().fetchTimer).not.toBeNull();
    tree.instance().componentWillUnmount();
    expect(tree.instance().fetchTimer).toBeNull();
  });
});
