import React from "react";
import { act } from "react-dom/test-utils";

import { shallow, mount } from "enzyme";

import moment from "moment";

import { MockThemeContext } from "__mocks__/Theme";
import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";

import { NavBar } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
  settingsStore.filterBarConfig.config.autohide = true;
  // fix startsAt & endsAt dates so they don't change between tests
  silenceFormStore.data.startsAt = moment([2018, 1, 30, 10, 25, 50]).utc();
  silenceFormStore.data.endsAt = moment([2018, 1, 30, 11, 25, 50]).utc();

  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
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
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
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
  it("navbar-brand shows 15 alerts with totalAlerts=15", () => {
    alertStore.info.totalAlerts = 15;
    const tree = MountedNavbar();
    const brand = tree.find("span.navbar-brand");
    expect(brand.text()).toBe("15");
  });

  it("navbar-nav includes 'flex-row' class with 0 filters", () => {
    ValidateNavClass(0, "flex-row");
  });

  it("navbar-nav includes 'flex-row' class with 1 filter", () => {
    ValidateNavClass(1, "flex-column");
  });

  it("navbar-nav includes 'flex-column' class with 2 filters", () => {
    ValidateNavClass(2, "flex-column");
  });

  it("navbar-nav includes 'flex-column' class with 3 filters", () => {
    ValidateNavClass(3, "flex-column");
  });

  it("navbar includes 'fixed-top' class by default", () => {
    const tree = MountedNavbar();
    const nav = tree.find(".navbar");
    expect(nav.props().className.split(" ")).toContain("fixed-top");
  });

  it("navbar includes 'fixed-top' class with fixedTop=true", () => {
    const tree = mount(
      <NavBar
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
        fixedTop={true}
      />
    );
    const nav = tree.find(".navbar");
    expect(nav.props().className.split(" ")).toContain("fixed-top");
    expect(nav.props().className.split(" ")).not.toContain("w-100");
  });

  it("navbar doesn't 'fixed-top' class with fixedTop=false", () => {
    const tree = mount(
      <NavBar
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
        fixedTop={false}
      />
    );
    const nav = tree.find(".navbar");
    expect(nav.props().className.split(" ")).not.toContain("fixed-top");
    expect(nav.props().className.split(" ")).toContain("w-100");
  });

  it("body 'padding-top' style is updated after calling NavbarOnResize()", () => {
    const tree = MountedNavbar();
    tree.instance().onResize(0, 10);
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("18px");

    tree.instance().onResize(0, 36);
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("44px");
  });
});

describe("<IdleTimer />", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("hides navbar after 12 seconds on mobile", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    jest.runTimersToTime(1000 * 13);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hides navbar after 3 minutes on desktop", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    jest.runTimersToTime(1000 * 60 * 3 + 1000);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("doesn't hide on mobile if there are unapplied filters", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.values.push(NewUnappliedFilter("cluster=dev"));
      jest.runTimersToTime(1000 * 13);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("doesn't hide on desktop if there are unapplied filters", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.values.push(NewUnappliedFilter("cluster=dev"));
      jest.runTimersToTime(1000 * 60 * 3 + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("hides on mobile if all unapplied filters finish applying", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.values.push(NewUnappliedFilter("cluster=dev"));
      jest.runTimersToTime(1000 * 13);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);

    alertStore.filters.applyAllFilters();
    jest.runTimersToTime(1000 * 13);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hides on desktop if all unapplied filters finish applying", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.values.push(NewUnappliedFilter("cluster=dev"));
      jest.runTimersToTime(1000 * 60 * 3 + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);

    alertStore.filters.applyAllFilters();
    jest.runTimersToTime(1000 * 60 * 3 + 1000);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hidden navbar shows up again after activity", () => {
    const tree = MountedNavbar();
    const instance = tree.instance();

    instance.onIdleTimerIdle();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);

    instance.onIdleTimerActive();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("body padding-top is 0px when navbar is hidden", () => {
    const tree = MountedNavbar();
    const instance = tree.instance();

    instance.onIdleTimerIdle();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("0px");
  });

  it("doesn't hide when autohide is disabled in settingsStore", () => {
    settingsStore.filterBarConfig.config.autohide = false;
    const tree = MountedNavbar();
    jest.runTimersToTime(1000 * 3600);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("doesn't hide when autohide is enabled in settingsStore but alertStore is paused", () => {
    settingsStore.filterBarConfig.config.autohide = true;
    const tree = MountedNavbar();
    alertStore.status.pause();
    jest.runTimersToTime(1000 * 3600);
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("hides navbar after alertStore is resumed", () => {
    settingsStore.filterBarConfig.config.autohide = true;
    const tree = MountedNavbar();

    act(() => {
      alertStore.status.pause();
      jest.runTimersToTime(1000 * 3600);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);

    act(() => {
      alertStore.status.resume();
      jest.runTimersToTime(1000 * 60 * 3 + 1000);
    });
    tree.update();
    act(() => {
      jest.runTimersToTime(1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });
});
