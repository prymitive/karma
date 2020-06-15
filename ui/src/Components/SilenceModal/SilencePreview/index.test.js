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
  MatcherValueToObject,
} from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { SilencePreview } from ".";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);

  const matcher = NewEmptyMatcher();
  matcher.name = "foo";
  matcher.values = [MatcherValueToObject("bar")];

  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.matchers = [matcher];
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
});

const MockAPIResponse = () => {
  const response = EmptyAPIResponse();

  response.grids = [
    {
      labelName: "",
      labelValue: "",
      alertGroups: [
        MockAlertGroup(
          { alertname: "foo" },
          [MockAlert([], { instance: "foo1" }, "active")],
          [],
          { job: "foo" },
          {}
        ),
        MockAlertGroup(
          { alertname: "bar" },
          [
            MockAlert([], { instance: "bar1" }, "active"),
            MockAlert([], { instance: "bar2" }, "active"),
          ],
          [],
          { job: "bar" },
          {}
        ),
      ],
      stateCount: {
        unprocessed: 1,
        suppressed: 2,
        active: 3,
      },
    },
  ];
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
  it("fetches matching alerts on mount", () => {
    MountedSilencePreview();
    expect(useFetchGet).toHaveBeenCalled();
  });

  it("fetch uses correct filters with single Alertmanager instance", () => {
    silenceFormStore.data.alertmanagers = [
      { label: "amName", value: ["amValue"] },
    ];
    MountedSilencePreview();
    expect(useFetchGet).toHaveBeenCalledWith(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28amValue%29%24"
    );
  });

  it("fetch uses correct filters with multiple Alertmanager instances", () => {
    silenceFormStore.data.alertmanagers = [
      { label: "cluster", value: ["am1", "am2"] },
    ];
    MountedSilencePreview();
    expect(useFetchGet).toHaveBeenCalledWith(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%7Cam2%29%24"
    );
  });

  it("matches snapshot", () => {
    useFetchGet.fetch.setMockedData({
      response: MockAPIResponse(),
      error: false,
      isLoading: false,
      isRetrying: false,
    });

    const tree = MountedSilencePreview();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders Placeholder while loading preview", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: false,
    });
    const tree = MountedSilencePreview();
    expect(tree.find("Placeholder")).toHaveLength(1);
  });

  it("renders StaticLabel after fetch", () => {
    const tree = MountedSilencePreview();
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

    const tree = MountedSilencePreview();
    expect(tree.text()).toMatch(/No alerts matched/);
  });

  it("renders FetchError on failed fetch", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: "Fetch error",
      isLoading: false,
      isRetrying: false,
    });

    const tree = MountedSilencePreview();
    expect(tree.find("FetchError")).toHaveLength(1);
    expect(tree.find("LabelSetList")).toHaveLength(0);
  });

  it("renders LabelSetList on successful fetch", () => {
    const tree = MountedSilencePreview();
    expect(tree.find("FetchError")).toHaveLength(0);
    expect(tree.find("LabelSetList")).toHaveLength(1);
  });

  it("clicking on the submit button moves form to the 'Submit' stage", () => {
    const tree = MountedSilencePreview();
    const button = tree.find(".btn-primary");
    button.simulate("click");
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.Submit);
  });
});
