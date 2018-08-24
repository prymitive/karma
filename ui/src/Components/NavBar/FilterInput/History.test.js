import React from "react";

import { mount, shallow } from "enzyme";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { History, HistoryMenu, ReduceFilter } from "./History";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

const MountedHistory = () => {
  return mount(
    <History alertStore={alertStore} settingsStore={settingsStore} />
  );
};

const ShallowHistoryMenu = historyTree => {
  const tree = shallow(
    <HistoryMenu
      popperPlacement={null}
      popperRef={null}
      popperStyle={null}
      filters={historyTree.instance().history.filters}
      onClear={historyTree.instance().clearHistory}
      alertStore={historyTree.props().alertStore}
      settingsStore={historyTree.props().settingsStore}
      afterClick={historyTree.instance().collapse.hide}
    />
  );
  return tree;
};

const MountedHistoryMenu = historyTree => {
  const tree = mount(
    <HistoryMenu
      popperPlacement={null}
      popperRef={null}
      popperStyle={null}
      filters={historyTree.instance().history.filters}
      onClear={historyTree.instance().clearHistory}
      alertStore={historyTree.props().alertStore}
      settingsStore={historyTree.props().settingsStore}
      afterClick={historyTree.instance().collapse.hide}
    />
  );
  return tree;
};

const AppliedFilter = (name, matcher, value) => {
  const filter = NewUnappliedFilter(`${name}${matcher}${value}`);
  filter.applied = true;
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  return filter;
};

const PopulateHistory = (instance, count) => {
  for (let i = 1; i <= count; i++) {
    alertStore.filters.values = [
      AppliedFilter("foo", "=", `bar${i}`),
      AppliedFilter("baz", "=~", `bar${i}`)
    ];
    instance.appendToHistory();
  }
};

describe("<History />", () => {
  it("renders dropdown button when menu is hidden", () => {
    const tree = MountedHistory();
    const dropdown = tree.find("button");
    expect(dropdown.props().className.split(" ")).toContain(
      "components-navbar-history"
    );
  });

  // Due to https://github.com/FezVrasta/popper.js/issues/478 we can't test
  // rendered dropdown content, only the fact that toggle value is updated
  it("renders dropdown button when menu is visible", () => {
    const tree = MountedHistory();
    const toggle = tree.find("button");

    expect(tree.instance().collapse.value).toBe(true);
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);
  });

  it("saves only applied filters to history", () => {
    alertStore.filters.values = [
      AppliedFilter("foo", "=", "bar"),
      NewUnappliedFilter("foo=unapplied"),
      AppliedFilter("baz", "!=", "bar")
    ];
    const tree = MountedHistory();
    tree.instance().appendToHistory();
    expect(tree.instance().history.filters).toHaveLength(1);
    expect(JSON.stringify(tree.instance().history.filters[0])).toBe(
      JSON.stringify([
        ReduceFilter(AppliedFilter("foo", "=", "bar")),
        ReduceFilter(AppliedFilter("baz", "!=", "bar"))
      ])
    );
  });
});

describe("<HistoryMenu />", () => {
  it("renders correctly when rendered with empty history", () => {
    const historyTree = MountedHistory();
    const tree = ShallowHistoryMenu(historyTree);
    expect(tree.text()).toBe(
      "<FontAwesomeIcon />Last used filtersEmpty<ActionButton /><ActionButton /><ActionButton />"
    );
  });

  it("renders correctly when rendered with a filter in history", () => {
    const historyTree = MountedHistory();
    PopulateHistory(historyTree.instance(), 1);

    const tree = ShallowHistoryMenu(historyTree);
    expect(tree.text()).toBe(
      "<FontAwesomeIcon />Last used filters<HistoryLabel /><HistoryLabel /><ActionButton /><ActionButton /><ActionButton />"
    );

    const labels = tree.find("HistoryLabel");
    expect(labels).toHaveLength(2);
    expect(labels.at(0).html()).toMatch(/>foo=bar1</);
    expect(labels.at(1).html()).toMatch(/>baz=~bar1</);
  });

  it("stores only up to maxSize last filter sets in history storage", () => {
    const historyTree = MountedHistory();
    const instance = historyTree.instance();
    const maxSize = instance.maxSize;
    PopulateHistory(instance, maxSize * 2);
    expect(instance.history.filters).toHaveLength(maxSize);
  });

  it("renders only up to maxSize last filter sets in history", () => {
    const historyTree = MountedHistory();
    const instance = historyTree.instance();
    PopulateHistory(instance, instance.maxSize * 2);

    const tree = ShallowHistoryMenu(historyTree);
    const labelSets = tree.find(".components-navbar-historymenu-labels");
    expect(labelSets).toHaveLength(8);

    // oldest pushed label should be rendered last
    const labelsLast = labelSets.last().find("HistoryLabel");
    expect(labelsLast).toHaveLength(2);
    expect(labelsLast.at(0).html()).toMatch(/>foo=bar9</);
    expect(labelsLast.at(1).html()).toMatch(/>baz=~bar9</);

    // most recently pushed label should be rendered fist
    const labelsFist = labelSets.first().find("HistoryLabel");
    expect(labelsFist).toHaveLength(2);
    expect(labelsFist.at(0).html()).toMatch(/>foo=bar16</);
    expect(labelsFist.at(1).html()).toMatch(/>baz=~bar16</);
  });

  it("clicking on 'Save filters' saves current filter set to Settings", () => {
    alertStore.filters.values = [
      AppliedFilter("foo", "=", "bar"),
      AppliedFilter("bar", "=~", "baz")
    ];

    const historyTree = MountedHistory();
    const tree = MountedHistoryMenu(historyTree);
    const button = tree.find(".component-history-button").at(0);
    expect(button.text()).toBe("Save filters");

    button.simulate("click");
    expect(settingsStore.savedFilters.config.filters).toHaveLength(2);
    expect(settingsStore.savedFilters.config.filters).toContain("foo=bar");
    expect(settingsStore.savedFilters.config.filters).toContain("bar=~baz");
  });

  it("clicking on 'Reset filters' clears current filter set in Settings", () => {
    settingsStore.savedFilters.config.filters = ["foo=bar"];

    const historyTree = MountedHistory();
    const tree = MountedHistoryMenu(historyTree);
    const button = tree.find(".component-history-button").at(1);
    expect(button.text()).toBe("Reset filters");

    button.simulate("click");
    expect(settingsStore.savedFilters.config.filters).toHaveLength(0);
  });

  it("clicking on 'Clear history' clears the history", () => {
    const historyTree = MountedHistory();
    const instance = historyTree.instance();
    PopulateHistory(instance, 5);
    expect(instance.history.filters).toHaveLength(5);

    const tree = MountedHistoryMenu(historyTree);
    const button = tree.find(".component-history-button").at(2);
    expect(button.text()).toBe("Clear history");

    button.simulate("click");
    expect(instance.history.filters).toHaveLength(0);
  });
});
