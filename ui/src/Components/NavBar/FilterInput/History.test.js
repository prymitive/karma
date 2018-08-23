import React from "react";
import renderer from "react-test-renderer";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { History, ReduceFilter } from "./History";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

const FakeHistory = () => {
  return renderer.create(
    <History alertStore={alertStore} settingsStore={settingsStore} />
  );
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
    const component = FakeHistory();
    const dropdown = component.root.findByType("button");
    expect(dropdown.props.className.split(" ")).toContain(
      "components-navbar-history"
    );
  });

  it("saves only applied filters to history", () => {
    alertStore.filters.values = [
      AppliedFilter("foo", "=", "bar"),
      NewUnappliedFilter("foo=unapplied"),
      AppliedFilter("baz", "!=", "bar")
    ];
    const tree = FakeHistory().toTree();
    tree.instance.appendToHistory();
    expect(tree.instance.history.filters).toHaveLength(1);
    expect(JSON.stringify(tree.instance.history.filters[0])).toBe(
      JSON.stringify([
        ReduceFilter(AppliedFilter("foo", "=", "bar")),
        ReduceFilter(AppliedFilter("baz", "!=", "bar"))
      ])
    );
  });
});
