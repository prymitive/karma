import React from "react";

import { shallow, mount } from "enzyme";

import moment from "moment";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { NavBar, NavbarOnResize } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
  // fix startsAt & endsAt dates so they don't change between tests
  silenceFormStore.data.startsAt = moment([2018, 1, 30, 10, 25, 50]).utc();
  silenceFormStore.data.endsAt = moment([2018, 1, 30, 11, 25, 50]).utc();
});

const RenderNavbar = () => {
  return shallow(
    <NavBar
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  ).find(".container");
};

const MountedNavbar = () => {
  return mount(
    <NavBar
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const ValidateNavClass = (totalFilters, expectedClass) => {
  for (let i = 0; i < totalFilters; i++) {
    alertStore.filters.values.push(NewUnappliedFilter(`foo=${i}`));
  }
  const tree = RenderNavbar();
  const nav = tree.find(".navbar-nav");
  expect(nav.props().className.split(" ")).toContain(expectedClass);
};

describe("<NavBar />", () => {
  it("matches snapshot with 0 alerts", () => {
    const tree = RenderNavbar();
    expect(tree.text()).toMatchSnapshot();
  });

  it("matches snapshot with 5 alerts", () => {
    alertStore.info.totalAlerts = 5;
    const tree = RenderNavbar();
    expect(tree.text()).toMatchSnapshot();
  });

  it("navbar-brand shows 15 alerts with totalAlerts=15", () => {
    alertStore.info.totalAlerts = 15;
    const tree = RenderNavbar();
    const brand = tree.find(".navbar-brand");
    expect(brand.text()).toBe("15<FetchIndicator />");
  });

  it("navbar-nav includes 'flex-row' class with 0 filters", () => {
    ValidateNavClass(0, "flex-row");
  });

  it("navbar-nav includes 'flex-row' class with 1 filter", () => {
    ValidateNavClass(1, "flex-row");
  });

  it("navbar-nav includes 'flex-column' class with 2 filters", () => {
    ValidateNavClass(2, "flex-column");
  });

  it("navbar-nav includes 'flex-column' class with 3 filters", () => {
    ValidateNavClass(3, "flex-column");
  });
});

describe("NavbarOnResize()", () => {
  it("body 'padding-top' style is updated after calling NavbarOnResize()", () => {
    NavbarOnResize(0, 10);
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("14px");

    NavbarOnResize(0, 36);
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("40px");
  });
});

describe("<IdleTimer />", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("hides navbar after 4 minutes", () => {
    const tree = MountedNavbar();
    expect(tree.find(".navbar")).toHaveLength(1);

    jest.runTimersToTime(1000 * 60 * 4);
    tree.update();
    expect(tree.find(".navbar")).toHaveLength(0);
  });

  it("hidden navbar shows up again after activity", () => {
    const tree = MountedNavbar();
    const instance = tree.instance();

    instance.activityStatus.idle = true;
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find(".navbar")).toHaveLength(0);

    instance.activityStatus.setActive();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find(".navbar")).toHaveLength(1);
  });

  it("body padding-top is 4px when navbar is hidden", () => {
    const tree = MountedNavbar();
    const instance = tree.instance();

    instance.activityStatus.setIdle();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("4px");
  });
});
