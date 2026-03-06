import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { History, HistoryMenu, ReduceFilter } from "./History";

let alertStore: AlertStore;
let settingsStore: Settings;

declare let global: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);

  global.window.innerWidth = 1024;
  jest.useFakeTimers();
});

const renderHistory = () => {
  return render(
    <History alertStore={alertStore} settingsStore={settingsStore} />,
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

const populateHistory = (count: number) => {
  for (let i = 1; i <= count; i++) {
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", `bar${i}`),
      AppliedFilter("baz", "=~", `bar${i}`),
    ]);
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }
};

describe("<History />", () => {
  it("menu content is hidden by default", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    expect(
      container.querySelector("div.dropdown-menu"),
    ).not.toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking toggle renders menu content", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking toggle twice hides menu content", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(
      container.querySelector("div.dropdown-menu"),
    ).not.toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking menu item hides menu content", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");

    fireEvent.click(toggle!);
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();

    const menuItem = container.querySelector(".component-history-button");
    fireEvent.click(menuItem!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(
      container.querySelector("div.dropdown-menu"),
    ).not.toBeInTheDocument();
    await act(() => promise);
  });

  it("saves only applied filters to history", async () => {
    const promise = Promise.resolve();
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", "bar"),
      NewUnappliedFilter("foo=unapplied"),
      AppliedFilter("baz", "!=", "bar"),
    ]);
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    expect(container.querySelectorAll("button.dropdown-item")).toHaveLength(1);
    expect(screen.getByText("foo=bar")).toBeInTheDocument();
    expect(screen.getByText("baz!=bar")).toBeInTheDocument();
    await act(() => promise);
  });
});

describe("<HistoryMenu />", () => {
  it("renders correctly when rendered with empty history", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    expect(screen.getByText("Last used filters")).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
    await act(() => promise);
  });

  it("renders correctly when rendered with a filter in history", async () => {
    const promise = Promise.resolve();
    act(() => {
      populateHistory(1);
    });
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    expect(screen.getByText("foo=bar1")).toBeInTheDocument();
    expect(screen.getByText("baz=~bar1")).toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking on a filter set in history populates alertStore", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();
    act(() => {
      populateHistory(1);
    });
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    const button = container.querySelector("button.dropdown-item");
    expect(button?.textContent).toBe("foo=bar1baz=~bar1");

    fireEvent.click(button!);
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
    const { container } = renderHistory();
    act(() => {
      populateHistory(16);
    });
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    expect(document.body.querySelectorAll("button.dropdown-item")).toHaveLength(
      8,
    );

    const labelSets = document.body.querySelectorAll(
      ".components-navbar-historymenu-labels",
    );
    expect(labelSets).toHaveLength(8);

    expect(screen.getByText("foo=bar16")).toBeInTheDocument();
    expect(screen.getByText("foo=bar9")).toBeInTheDocument();
    await act(() => promise);
  });

  it("renders only up to 4 last filter sets in history on mobile", async () => {
    global.window.innerWidth = 500;

    const promise = Promise.resolve();
    const { container } = renderHistory();
    act(() => {
      populateHistory(16);
    });
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    expect(document.body.querySelectorAll("button.dropdown-item")).toHaveLength(
      4,
    );

    const labelSets = document.body.querySelectorAll(
      ".components-navbar-historymenu-labels",
    );
    expect(labelSets).toHaveLength(4);

    expect(screen.getByText("foo=bar16")).toBeInTheDocument();
    expect(screen.getByText("foo=bar13")).toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking on 'Save filters' saves current filter set to Settings", async () => {
    const promise = Promise.resolve();
    alertStore.filters.setFilterValues([
      AppliedFilter("foo", "=", "bar"),
      AppliedFilter("bar", "=~", "baz"),
    ]);

    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);
    const button = screen.getByText("Save filters");

    fireEvent.click(button);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(settingsStore.savedFilters.config.filters).toHaveLength(2);
    expect(settingsStore.savedFilters.config.filters).toContain("foo=bar");
    expect(settingsStore.savedFilters.config.filters).toContain("bar=~baz");
    await act(() => promise);
  });

  it("clicking on 'Reset filters' clears current filter set in Settings", async () => {
    const promise = Promise.resolve();
    settingsStore.savedFilters.save(["foo=bar"]);
    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    const button = screen.getByText("Reset filters");
    fireEvent.click(button);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(settingsStore.savedFilters.config.filters).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking on 'Clear history' button triggers clear action", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();

    act(() => {
      populateHistory(3);
    });

    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    const historyItemsBefore = document.body.querySelectorAll(
      ".components-navbar-historymenu-labels",
    );
    expect(historyItemsBefore.length).toBeGreaterThan(0);

    const clearButton = screen.getByText("Clear history");
    fireEvent.click(clearButton);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      container.querySelector("div.dropdown-menu"),
    ).not.toBeInTheDocument();

    await act(() => promise);
  });

  it("HistoryMenu renders correctly with null coordinates", () => {
    render(
      <HistoryMenu
        x={null}
        y={null}
        floating={null}
        strategy="absolute"
        maxHeight={null}
        filters={[]}
        alertStore={alertStore}
        settingsStore={settingsStore}
        afterClick={jest.fn()}
        onClear={jest.fn()}
      />,
    );
    const menu = document.body.querySelector(
      ".components-navbar-historymenu",
    ) as HTMLElement;
    expect(menu.style.top).toBe("");
    expect(menu.style.left).toBe("");
  });

  it("ReduceFilter returns a reduced filter object", () => {
    const filter = AppliedFilter("foo", "=", "bar");
    const reduced = ReduceFilter(filter);
    expect(reduced).toEqual({
      raw: "foo=bar",
      name: "foo",
      matcher: "=",
      value: "bar",
    });
  });
});

describe("History localStorage", () => {
  // Verifies that history entries persisted in localStorage by a previous
  // session are loaded and displayed when the component mounts.
  it("loads pre-populated localStorage on mount", async () => {
    const promise = Promise.resolve();
    const savedFilters = [
      [{ raw: "cluster=prod", name: "cluster", matcher: "=", value: "prod" }],
      [{ raw: "env=staging", name: "env", matcher: "=", value: "staging" }],
    ];
    localStorage.setItem("filters", JSON.stringify({ filters: savedFilters }));

    const { container } = renderHistory();
    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    expect(screen.getByText("cluster=prod")).toBeInTheDocument();
    expect(screen.getByText("env=staging")).toBeInTheDocument();
    expect(container.querySelectorAll("button.dropdown-item")).toHaveLength(2);
    await act(() => promise);
  });

  // Verifies that localStored persists observable changes to localStorage
  // via a delayed reaction (setTimeout 0).
  it("localStored persists observable changes to localStorage", () => {
    const { localStored } = require("Common/LocalStore");
    const { runInAction } = require("mobx");
    const store = localStored("test_persist_key", { filters: [] as any[] });

    // Flush the initial write (reaction fires via setTimeout 0)
    jest.runAllTimers();
    const afterInit = JSON.parse(
      localStorage.getItem("test_persist_key") || "{}",
    );
    expect(afterInit.filters).toEqual([]);

    runInAction(() => {
      store.value.filters = [
        [{ raw: "foo=bar", name: "foo", matcher: "=", value: "bar" }],
      ];
    });

    // Flush the reaction that persists to localStorage
    jest.runAllTimers();
    const afterSet = JSON.parse(
      localStorage.getItem("test_persist_key") || "{}",
    );
    expect(afterSet.filters).toHaveLength(1);
    expect(afterSet.filters[0]).toEqual([
      { raw: "foo=bar", name: "foo", matcher: "=", value: "bar" },
    ]);

    store.destroy();
    localStorage.removeItem("test_persist_key");
  });

  // Verifies that all rapid sequential filter changes are captured in
  // history and none are lost due to timing.
  it("preserves all sequential filter changes in history", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();

    act(() => {
      alertStore.filters.setFilterValues([
        AppliedFilter("cluster", "=", "prod"),
      ]);
      jest.runOnlyPendingTimers();
    });

    act(() => {
      alertStore.filters.setFilterValues([
        AppliedFilter("env", "=", "staging"),
      ]);
      jest.runOnlyPendingTimers();
    });

    act(() => {
      alertStore.filters.setFilterValues([
        AppliedFilter("region", "=", "us-east"),
      ]);
      jest.runOnlyPendingTimers();
    });

    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    expect(container.querySelectorAll("button.dropdown-item")).toHaveLength(3);
    expect(screen.getByText("region=us-east")).toBeInTheDocument();
    expect(screen.getByText("env=staging")).toBeInTheDocument();
    expect(screen.getByText("cluster=prod")).toBeInTheDocument();
    await act(() => promise);
  });

  // Simulates a second browser tab writing to localStorage and firing a
  // StorageEvent. Verifies the component picks up the cross-tab change.
  // mobx-stored's propagateChangesToMemory handler calls set(obsVal, newValue)
  // which replaces the observable state and re-establishes the persistence
  // autorun, so multiple timer flushes are needed.
  it("picks up StorageEvent from another tab", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();

    act(() => {
      alertStore.filters.setFilterValues([AppliedFilter("foo", "=", "bar")]);
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });

    const externalFilters = {
      filters: [
        [
          {
            raw: "external=filter",
            name: "external",
            matcher: "=",
            value: "filter",
          },
        ],
      ],
    };
    const newValue = JSON.stringify(externalFilters);
    localStorage.setItem("filters", newValue);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "filters",
          newValue: newValue,
          storageArea: localStorage,
        }),
      );
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });

    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    expect(screen.getByText("external=filter")).toBeInTheDocument();
    await act(() => promise);
  });

  // Demonstrates the cross-tab race condition. When tab B receives a
  // StorageEvent with tab A's history and then tab B's own alertStore
  // filters change, the History component's autorun rebuilds history
  // from only what's in its own alertStore. Entries from tab A that
  // are not in tab B's alertStore are preserved only if they were
  // already in the in-memory history.config.filters. If the
  // StorageEvent arrived after the autorun already ran, tab A's
  // entries could be lost.
  it("StorageEvent followed by filter change preserves cross-tab history", async () => {
    const promise = Promise.resolve();
    const { container } = renderHistory();

    // Simulate tab A writing history with "cluster=prod" to localStorage
    // and firing a StorageEvent that tab B receives
    const tabAHistory = {
      filters: [
        [
          {
            raw: "cluster=prod",
            name: "cluster",
            matcher: "=",
            value: "prod",
          },
        ],
      ],
    };
    const tabAValue = JSON.stringify(tabAHistory);
    localStorage.setItem("filters", tabAValue);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "filters",
          newValue: tabAValue,
          storageArea: localStorage,
        }),
      );
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });

    // Now tab B's own alertStore gets a different filter applied.
    // The History autorun should merge tab A's "cluster=prod" with
    // tab B's new "env=staging" in history.
    act(() => {
      alertStore.filters.setFilterValues([
        AppliedFilter("env", "=", "staging"),
      ]);
      jest.runOnlyPendingTimers();
    });

    const toggle = container.querySelector("button.cursor-pointer");
    fireEvent.click(toggle!);

    // Both tab A's and tab B's filter sets should appear in history.
    // If "cluster=prod" is missing, the autorun overwrote tab A's data.
    expect(screen.getByText("env=staging")).toBeInTheDocument();
    expect(screen.getByText("cluster=prod")).toBeInTheDocument();
    expect(container.querySelectorAll("button.dropdown-item")).toHaveLength(2);
    await act(() => promise);
  });
});
