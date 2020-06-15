import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject,
} from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { MatchCounter } from "./MatchCounter";

let matcher;
let silenceFormStore;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
  matcher.name = "foo";
  matcher.values = [MatcherValueToObject("bar")];
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
});

const MountedMatchCounter = () => {
  return mount(
    <MatchCounter silenceFormStore={silenceFormStore} matcher={matcher} />
  );
};

describe("<MatchCounter />", () => {
  it("matches snapshot", () => {
    const tree = MountedMatchCounter();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders spinner icon while fetching", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: false,
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-spinner")).toHaveLength(1);
    expect(tree.find("svg.fa-spinner.text-danger")).toHaveLength(0);
  });

  it("renders spinner icon with text-danger while retrying fetching", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: true,
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-spinner.text-danger")).toHaveLength(1);
  });

  it("renders error icon on failed fetch", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: "failed",
      isLoading: false,
      isRetrying: false,
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-exclamation-circle.text-danger")).toHaveLength(1);
  });

  it("totalAlerts is 0 after mount", () => {
    useFetchGet.fetch.setMockedData({
      response: { totalAlerts: 0 },
      error: false,
      isLoading: false,
      isRetrying: false,
    });

    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("0");
  });

  it("updates totalAlerts after successful fetch", () => {
    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("25");
  });

  it("sends correct query string for a 'foo=bar' matcher", () => {
    MountedMatchCounter();
    expect(useFetchGet.mock.calls[0][0]).toBe("./alerts.json?q=foo%3Dbar");
  });

  it("sends correct query string for a 'foo=~bar' matcher", () => {
    matcher.isRegex = true;
    MountedMatchCounter();
    expect(useFetchGet.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3D~%5Ebar%24"
    );
  });

  it("sends correct query string for a 'foo=~(bar|baz)' matcher", () => {
    matcher.values = [MatcherValueToObject("bar"), MatcherValueToObject("baz")];
    matcher.isRegex = true;
    silenceFormStore.data.alertmanagers = [];
    MountedMatchCounter();
    expect(useFetchGet.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3D~%5E%28bar%7Cbaz%29%24"
    );
  });

  it("selecting one Alertmanager instance appends it to the filters", () => {
    silenceFormStore.data.alertmanagers = [MatcherValueToObject("am1")];
    MountedMatchCounter();
    expect(useFetchGet.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%29%24"
    );
  });

  it("selecting two Alertmanager instances appends it correctly to the filters", () => {
    silenceFormStore.data.alertmanagers = [
      MatcherValueToObject("am1"),
      MatcherValueToObject("am1"),
    ];
    MountedMatchCounter();
    expect(useFetchGet.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%7Cam1%29%24"
    );
  });
});
