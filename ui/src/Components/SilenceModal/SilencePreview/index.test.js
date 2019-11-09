import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import { MockAlertGroup, MockAlert } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher,
  MatcherValueToObject
} from "Stores/SilenceFormStore";
import { SilencePreview } from ".";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  fetch.resetMocks();

  alertStore = new AlertStore([]);

  const matcher = NewEmptyMatcher();
  matcher.name = "foo";
  matcher.values = [MatcherValueToObject("bar")];

  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.matchers = [matcher];
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MockAPIResponse = () => {
  const response = EmptyAPIResponse();
  response.groups = {
    "1": MockAlertGroup(
      { alertname: "foo" },
      [MockAlert([], { instance: "foo1" }, "active")],
      [],
      { job: "foo" },
      {}
    ),
    "2": MockAlertGroup(
      { alertname: "bar" },
      [
        MockAlert([], { instance: "bar1" }, "active"),
        MockAlert([], { instance: "bar2" }, "active")
      ],
      [],
      { job: "bar" },
      {}
    )
  };
  return response;
};

const MountedSilencePreview = () => {
  return mount(
    <SilencePreview
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<SilencePreview />", () => {
  it("fetches matching alerts on mount", async () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalled();
  });

  it("fetch uses correct filters with single Alertmanager instance", async () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));
    silenceFormStore.data.alertmanagers = [
      { label: "amName", value: ["amValue"] }
    ];

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(
      fetch
    ).toHaveBeenCalledWith(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28amValue%29%24",
      { credentials: "include" }
    );
  });

  it("fetch uses correct filters with multiple Alertmanager instances", async () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));
    silenceFormStore.data.alertmanagers = [
      { label: "cluster", value: ["am1", "am2"] }
    ];

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(
      fetch
    ).toHaveBeenCalledWith(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%7Cam2%29%24",
      { credentials: "include" }
    );
  });

  it("matches snapshot", async () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders FetchError on failed fetch", async () => {
    const consoleSpy = jest
      .spyOn(console, "trace")
      .mockImplementation(() => {});
    fetch.mockReject("Fetch error");

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();

    tree.update();
    expect(tree.find("FetchError")).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
    expect(tree.find("LabelSetList")).toHaveLength(0);
  });

  it("renders LabelSetList on successful fetch", async () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));

    const tree = MountedSilencePreview();
    await expect(tree.instance().matchedAlerts.fetch).resolves.toBeUndefined();

    tree.update();
    expect(tree.find("FetchError")).toHaveLength(0);
    expect(tree.find("LabelSetList")).toHaveLength(1);
  });

  it("clicking on the submit button moves form to the 'Submit' stage", () => {
    fetch.mockResponse(JSON.stringify(MockAPIResponse()));

    const tree = MountedSilencePreview();
    const button = tree.find(".btn-outline-primary");
    button.simulate("click");
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.Submit);
  });
});
