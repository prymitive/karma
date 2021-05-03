import { act } from "react-dom/test-utils";

import { mount, ReactWrapper } from "enzyme";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { History } from "./History";

let alertStore: AlertStore;
let settingsStore: Settings;

declare let global: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);

  global.window.innerWidth = 1024;
  jest.useFakeTimers();
});

afterEach(() => {
  localStorage.setItem("history.filters", "");
});

const MountedHistory = () => {
  return mount(
    <History alertStore={alertStore} settingsStore={settingsStore} />
  );
};

const AppliedFilter = (name: string, matcher: string, value: string) => {
  const filter = NewUnappliedFilter(`${name}${matcher}${value}`);
  filter.applied = true;
  filter.isValid = true;
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  return filter;
};

const PopulateHistory = (tree: ReactWrapper, count: number) => {
  for (let i = 1; i <= count; i++) {
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", `bar${i}`),
      AppliedFilter("baz", "=~", `bar${i}`),
    ]);
    tree.update();
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }
};

describe("<History />", () => {
  it("menu content is hidden by default", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking toggle renders menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    const toggle = tree.find("button.cursor-pointer");
    toggle.simulate("click");
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("clicking toggle twice hides menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    const toggle = tree.find("button.cursor-pointer");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking menu item hides menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    const toggle = tree.find("button.cursor-pointer");

    toggle.simulate("click");
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    tree.find(".component-history-button").at(0).simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("saves only applied filters to history", async () => {
    const promise = Promise.resolve();
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", "bar"),
      NewUnappliedFilter("foo=unapplied"),
      AppliedFilter("baz", "!=", "bar"),
    ]);
    const tree = MountedHistory();
    tree.find("button.cursor-pointer").simulate("click");
    expect(tree.find("button.dropdown-item")).toHaveLength(1);
    const labels = tree.find("HistoryLabel");
    expect(labels).toHaveLength(2);
    expect(labels.at(0).html()).toMatch(/>foo=bar</);
    expect(labels.at(1).html()).toMatch(/>baz!=bar</);
    await act(() => promise);
  });
});

describe("<HistoryMenu />", () => {
  it("renders correctly when rendered with empty history", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    tree.find("button.cursor-pointer").simulate("click");
    expect(tree.text()).toBe(
      "Last used filtersEmptySave filtersReset filtersClear history"
    );
    await act(() => promise);
  });

  it("renders correctly when rendered with a filter in history", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    act(() => {
      PopulateHistory(tree, 1);
    });
    tree.find("button.cursor-pointer").simulate("click");

    expect(tree.text()).toBe(
      "Last used filtersfoo=bar1baz=~bar1Save filtersReset filtersClear history"
    );

    const labels = tree.find("HistoryLabel");
    expect(labels).toHaveLength(2);
    expect(labels.at(0).html()).toMatch(/>foo=bar1</);
    expect(labels.at(1).html()).toMatch(/>baz=~bar1</);
    await act(() => promise);
  });

  it("clicking on a filter set in history populates alertStore", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    act(() => {
      PopulateHistory(tree, 1);
    });
    tree.find("button.cursor-pointer").simulate("click");

    const button = tree.find("button.dropdown-item").at(0);
    expect(button.text()).toBe("foo=bar1baz=~bar1");

    alertStore.filters.setFilterValues([AppliedFilter("job", "=", "foo")]);
    expect(alertStore.filters.values).toHaveLength(1);

    button.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(alertStore.filters.values).toHaveLength(2);
    expect(alertStore.filters.values[0]).toMatchObject({ raw: "foo=bar1" });
    expect(alertStore.filters.values[1]).toMatchObject({ raw: "baz=~bar1" });
    await act(() => promise);
  });

  it("renders only up to 8 last filter sets in history on desktop", async () => {
    global.window.innerWidth = 1024;

    const promise = Promise.resolve();
    const tree = MountedHistory();
    act(() => {
      PopulateHistory(tree, 16);
    });
    tree.find("button.cursor-pointer").simulate("click");
    expect(tree.find("button.dropdown-item")).toHaveLength(8);

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
    await act(() => promise);
  });

  it("renders only up to 4 last filter sets in history on mobile", async () => {
    global.window.innerWidth = 500;

    const promise = Promise.resolve();
    const tree = MountedHistory();
    act(() => {
      PopulateHistory(tree, 16);
    });
    tree.find("button.cursor-pointer").simulate("click");
    expect(tree.find("button.dropdown-item")).toHaveLength(4);

    const labelSets = tree.find(".components-navbar-historymenu-labels");
    expect(labelSets).toHaveLength(4);

    // oldest pushed label should be rendered last
    const labelsLast = labelSets.last().find("HistoryLabel");
    expect(labelsLast).toHaveLength(2);
    expect(labelsLast.at(0).html()).toMatch(/>foo=bar13</);
    expect(labelsLast.at(1).html()).toMatch(/>baz=~bar13</);

    // most recently pushed label should be rendered fist
    const labelsFist = labelSets.first().find("HistoryLabel");
    expect(labelsFist).toHaveLength(2);
    expect(labelsFist.at(0).html()).toMatch(/>foo=bar16</);
    expect(labelsFist.at(1).html()).toMatch(/>baz=~bar16</);
    await act(() => promise);
  });

  it("clicking on 'Save filters' saves current filter set to Settings", () => {
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", "bar"),
      AppliedFilter("bar", "=~", "baz"),
    ]);

    const tree = MountedHistory();
    tree.find("button.cursor-pointer").simulate("click");
    const button = tree.find(".component-history-button").at(0);
    expect(button.text()).toBe("Save filters");

    button.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(settingsStore.savedFilters.config.filters).toHaveLength(2);
    expect(settingsStore.savedFilters.config.filters).toContain("foo=bar");
    expect(settingsStore.savedFilters.config.filters).toContain("bar=~baz");
  });

  it("clicking on 'Reset filters' clears current filter set in Settings", () => {
    settingsStore.savedFilters.save(["foo=bar"]);
    const tree = MountedHistory();
    tree.find("button.cursor-pointer").simulate("click");

    const button = tree.find(".component-history-button").at(1);
    expect(button.text()).toBe("Reset filters");
    button.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(settingsStore.savedFilters.config.filters).toHaveLength(0);
  });

  it("clicking on 'Clear history' clears the history", async () => {
    const promise = Promise.resolve();
    const tree = MountedHistory();
    act(() => {
      PopulateHistory(tree, 5);
    });
    tree.find("button.cursor-pointer").simulate("click");
    expect(tree.find("button.dropdown-item")).toHaveLength(5);

    const button = tree.find(".component-history-button").at(2);
    expect(button.text()).toBe("Clear history");
    button.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("button.dropdown-item")).toHaveLength(0);
    await act(() => promise);
  });
});
