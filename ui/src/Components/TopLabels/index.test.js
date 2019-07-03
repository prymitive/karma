import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

import { TopLabels } from ".";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

const MountedTopLabels = () => {
  return mount(
    <Provider alertStore={alertStore}>
      <TopLabels alertStore={alertStore} settingsStore={settingsStore} />
    </Provider>
  );
};

describe("<TopLabels />", () => {
  it("doesn't render anything when settingsStore.topLabelsConfig.config.show is false", () => {
    settingsStore.topLabelsConfig.config.show = false;
    const tree = MountedTopLabels();
    expect(tree.html()).toBe("");
  });

  it("matches snapshot", () => {
    settingsStore.topLabelsConfig.config.show = true;
    alertStore.data.counters = [{ name: "foo", value: "bar", percent: "50" }];
    const tree = MountedTopLabels();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't render labels with 100%", () => {
    settingsStore.topLabelsConfig.config.show = true;
    settingsStore.topLabelsConfig.config.minPercent = 1;
    alertStore.data.counters = [
      { name: "foo80", value: "80", percent: 80 },
      { name: "foo100", value: "100", percent: 100 },
      { name: "foo74", value: "74", percent: 74 }
    ];
    const tree = MountedTopLabels();
    expect(tree.find(".components-label")).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders only labels with >=75% when settingsStore.topLabelsConfig.config.minPercent is 75", () => {
    settingsStore.topLabelsConfig.config.show = true;
    settingsStore.topLabelsConfig.config.minPercent = 75;
    alertStore.data.counters = [
      { name: "foo80", value: "80", percent: 80 },
      { name: "foo70", value: "70", percent: 70 },
      { name: "foo74", value: "74", percent: 74 },
      { name: "foo75", value: "75", percent: 75 },
      { name: "foo15", value: "15", percent: 15 },
      { name: "foo99", value: "99", percent: 99 }
    ];
    const tree = MountedTopLabels();
    expect(tree.find(".components-label")).toHaveLength(3);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("clicking on the close icon sets settingsStore.topLabelsConfig.config.show to 'false'", () => {
    settingsStore.topLabelsConfig.config.show = true;
    alertStore.data.counters = [{ name: "foo", value: "99", percent: 99 }];
    const tree = MountedTopLabels();
    tree.find("svg.close").simulate("click");
    expect(settingsStore.topLabelsConfig.config.show).toBe(false);
  });
});
