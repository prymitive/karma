import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import NavBar from ".";
import { MobileIdleTimeout, DesktopIdleTimeout } from "./timeouts";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let resizeCallback: (val: any) => void;

declare let global: any;

beforeEach(() => {
  jest.useFakeTimers();
  global.ResizeObserver = jest.fn((cb) => {
    resizeCallback = cb;
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });
  global.ResizeObserverEntry = jest.fn();

  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();
  settingsStore.filterBarConfig.setAutohide(true);
  // fix startsAt & endsAt dates so they don't change between tests
  silenceFormStore.data.setStart(new Date(Date.UTC(2018, 1, 30, 10, 25, 50)));
  silenceFormStore.data.setEnd(new Date(Date.UTC(2018, 1, 30, 11, 25, 50)));

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
});

const MountedNavbar = (fixedTop?: boolean) => {
  return mount(
    <NavBar
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
      fixedTop={fixedTop}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<NavBar />", () => {
  it("navbar-brand shows 15 alerts with totalAlerts=15", () => {
    alertStore.info.setTotalAlerts(15);
    const tree = MountedNavbar();
    const brand = tree.find("span.navbar-brand");
    expect(brand.text()).toBe("15");
  });

  it("navbar includes 'fixed-top' class by default", () => {
    const tree = MountedNavbar();
    const nav = tree.find(".navbar");
    expect((nav.props().className as string).split(" ")).toContain("fixed-top");
  });

  it("navbar includes 'fixed-top' class with fixedTop=true", () => {
    const tree = MountedNavbar(true);
    const nav = tree.find(".navbar");
    expect((nav.props().className as string).split(" ")).toContain("fixed-top");
    expect((nav.props().className as string).split(" ")).not.toContain("w-100");
  });

  it("navbar doesn't 'fixed-top' class with fixedTop=false", () => {
    const tree = MountedNavbar(false);
    const nav = tree.find(".navbar");
    expect((nav.props().className as string).split(" ")).not.toContain(
      "fixed-top"
    );
    expect((nav.props().className as string).split(" ")).toContain("w-100");
  });

  it("body 'padding-top' style is updated after resize", () => {
    const tree = MountedNavbar();
    act(() => {
      resizeCallback([{ contentRect: { width: 100, height: 10 } }]);
    });
    tree.setProps({});
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("18px");

    act(() => {
      resizeCallback([{ contentRect: { width: 100, height: 36 } }]);
    });
    tree.setProps({});
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("44px");
  });
});

describe("<IdleTimer />", () => {
  it("hides navbar after MobileIdleTimeout on mobile", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    act(() => {
      jest.runTimersToTime(MobileIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hides navbar after DesktopIdleTimeout on desktop", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    act(() => {
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("doesn't hide on mobile if there are unapplied filters", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.addFilter("cluster=dev");
      jest.runTimersToTime(MobileIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("doesn't hide on desktop if there are unapplied filters", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.addFilter("cluster=dev");
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("hides on mobile if all unapplied filters finish applying", () => {
    global.window.innerWidth = 500;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.addFilter("cluster=dev");
      jest.runTimersToTime(MobileIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);

    alertStore.filters.applyAllFilters();
    act(() => {
      jest.runTimersToTime(MobileIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hides on desktop if all unapplied filters finish applying", () => {
    global.window.innerWidth = 769;
    const tree = MountedNavbar();
    act(() => {
      alertStore.filters.addFilter("cluster=dev");
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);

    alertStore.filters.applyAllFilters();
    act(() => {
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);
  });

  it("hidden navbar shows up again after activity", () => {
    const tree = MountedNavbar();

    act(() => {
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(false);
    expect(tree.find(".container").hasClass("invisible")).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"));
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("body padding-top is 0px when navbar is hidden", () => {
    const tree = MountedNavbar();
    act(() => {
      jest.runTimersToTime(DesktopIdleTimeout + 1000);
    });
    tree.update();
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top")
    ).toBe("0px");
  });

  it("doesn't hide when autohide is disabled in settingsStore", () => {
    settingsStore.filterBarConfig.setAutohide(false);
    const tree = MountedNavbar();
    act(() => {
      jest.runTimersToTime(1000 * 3600);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("doesn't hide when autohide is enabled in settingsStore but alertStore is paused", () => {
    settingsStore.filterBarConfig.setAutohide(true);
    const tree = MountedNavbar();
    alertStore.status.pause();
    act(() => {
      jest.runTimersToTime(1000 * 3600);
    });
    tree.update();
    expect(tree.find(".container").hasClass("visible")).toBe(true);
    expect(tree.find(".container").hasClass("invisible")).toBe(false);
  });

  it("hides navbar after alertStore is resumed", () => {
    settingsStore.filterBarConfig.setAutohide(true);
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
