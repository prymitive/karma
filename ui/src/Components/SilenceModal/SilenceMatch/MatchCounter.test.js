import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject
} from "Stores/SilenceFormStore";
import { MatchCounter } from "./MatchCounter";

let matcher;
let silenceFormStore;

beforeEach(() => {
  fetch.resetMocks();

  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedMatchCounter = () => {
  return mount(
    <MatchCounter silenceFormStore={silenceFormStore} matcher={matcher} />
  );
};

describe("<MatchCounter />", () => {
  it("matches snapshot with empty matcher", () => {
    const tree = MountedMatchCounter();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("logs a trace on failed fetch", async () => {
    const consoleSpy = jest
      .spyOn(console, "trace")
      .mockImplementation(() => {});
    fetch.mockReject("Fetch error");

    // we need to set name & value to trigger fetch
    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("renders error icon on failed fetch", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.mockReject("Fetch error");

    // we need to set name & value to trigger fetch
    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(toDiffableHtml(tree.html())).toMatch(/exclamation-circle/);
  });

  it("totalAlerts is 0 after mount", async () => {
    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("0");
  });

  it("updates totalAlerts after successful fetch", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 123 }));

    // we need to set name & value to trigger fetch
    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];

    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("0");
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(tree.text()).toBe("123");
  });

  it("sends correct query string for a 'foo=bar' matcher", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 0 }));

    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];
    matcher.isRegex = false;

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe("./alerts.json?q=foo%3Dbar");
  });

  it("sends correct query string for a 'foo=~bar' matcher", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 0 }));

    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];
    matcher.isRegex = true;

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe("./alerts.json?q=foo%3D~%5Ebar%24");
  });

  it("sends correct query string for a 'foo=~(bar|baz)' matcher", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 0 }));

    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar"), MatcherValueToObject("baz")];
    matcher.isRegex = true;

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3D~%5E%28bar%7Cbaz%29%24"
    );
  });

  it("selecting one Alertmanager instance appends it to the filters", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 0 }));

    silenceFormStore.data.alertmanagers = [MatcherValueToObject("am1")];
    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];
    matcher.isRegex = false;

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%29%24"
    );
  });

  it("selecting two Alertmanager instances appends it correctly to the filters", async () => {
    fetch.mockResponse(JSON.stringify({ totalAlerts: 0 }));

    silenceFormStore.data.alertmanagers = [
      MatcherValueToObject("am1"),
      MatcherValueToObject("am1")
    ];
    matcher.name = "foo";
    matcher.values = [MatcherValueToObject("bar")];
    matcher.isRegex = false;

    const tree = MountedMatchCounter();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%7Cam1%29%24"
    );
  });
});
