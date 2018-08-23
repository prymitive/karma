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

const AppliedFilter = (name, matcher, value) => {
  const filter = NewUnappliedFilter(`${name}${matcher}${value}`);
  filter.applied = true;
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  return filter;
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
    alertStore.filters.values = [AppliedFilter("foo", "=~", "bar")];
    const historyTree = MountedHistory();
    historyTree.instance().appendToHistory();

    const tree = ShallowHistoryMenu(historyTree);
    expect(tree.text()).toBe(
      "<FontAwesomeIcon />Last used filters<HistoryLabel /><ActionButton /><ActionButton /><ActionButton />"
    );

    const label = tree.find("HistoryLabel");
    expect(label.html()).toMatch(/>foo=~bar</);
  });
});
