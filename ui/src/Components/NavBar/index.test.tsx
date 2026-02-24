import { act } from "react";

import { render, screen } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { useIdleTimer } from "react-idle-timer";

import { IsMobile } from "Common/Device";
import { MockThemeContext } from "__fixtures__/Theme";
import { EmptyAPIResponse } from "__fixtures__/Fetch";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import NavBar from ".";

jest.mock("react-idle-timer");
jest.mock("Common/Device");

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let resizeCallback: (val: any) => void;
let idleTimerCallbacks: { onIdle?: () => void; onActive?: () => void };

declare let global: any;

beforeEach(() => {
  jest.useFakeTimers();
  idleTimerCallbacks = {};
  (useIdleTimer as jest.Mock).mockImplementation((options) => {
    idleTimerCallbacks.onIdle = options.onIdle;
    idleTimerCallbacks.onActive = options.onActive;
    return { pause: jest.fn(), reset: jest.fn() };
  });
  global.ResizeObserver = jest.fn((cb) => {
    resizeCallback = cb;
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });
  global.ResizeObserverEntry = jest.fn();

  alertStore = new AlertStore([]);
  // Mock fetchWithThrottle to prevent async state updates outside of act()
  jest.spyOn(alertStore, "fetchWithThrottle").mockImplementation(() => {
    alertStore.status.setIdle();
    return Promise.resolve();
  });
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

  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [
      {
        name: "dev",
        cluster: "dev",
        clusterMembers: ["dev"],
        uri: "https://am.example.com",
        publicURI: "https://am.example.com",
        error: "",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        version: "",
      },
    ],
    clusters: { dev: ["dev"] },
  });

  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify(EmptyAPIResponse()),
  });
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  fetchMock.mockReset();
});

const renderNavbar = (fixedTop?: boolean) => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <NavBar
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
        fixedTop={fixedTop}
      />
    </ThemeContext.Provider>,
  );
};

describe("<NavBar />", () => {
  it("sets isIdle to true after idle timeout", () => {
    // Verifies that onIdle callback from react-idle-timer sets isIdle to true
    renderNavbar();
    expect(alertStore.ui.isIdle).toBe(false);

    act(() => {
      idleTimerCallbacks.onIdle?.();
    });

    expect(alertStore.ui.isIdle).toBe(true);
  });

  it("sets isIdle to false when user becomes active", () => {
    // Verifies that onActive callback from react-idle-timer sets isIdle to false
    renderNavbar();

    act(() => {
      idleTimerCallbacks.onIdle?.();
    });
    expect(alertStore.ui.isIdle).toBe(true);

    act(() => {
      idleTimerCallbacks.onActive?.();
    });
    expect(alertStore.ui.isIdle).toBe(false);
  });

  it("navbar becomes invisible when idle", () => {
    // Verifies that navbar container class changes to invisible when idle
    const { container } = renderNavbar();

    expect(container.querySelector(".visible")).toBeInTheDocument();
    expect(container.querySelector(".invisible")).not.toBeInTheDocument();

    act(() => {
      idleTimerCallbacks.onIdle?.();
    });

    expect(alertStore.ui.isIdle).toBe(true);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(container.querySelector(".invisible")).toBeInTheDocument();
  });

  it("pauses idle timer when alertStore.status.paused is true", () => {
    // Verifies that idle timer is paused when alerts are paused
    renderNavbar();

    act(() => {
      alertStore.status.pause();
    });

    act(() => {
      jest.advanceTimersByTime(1000 * 60 * 3 + 1000);
    });

    expect(alertStore.ui.isIdle).toBe(false);
  });

  it("renders null with no upstreams", () => {
    alertStore.data.setUpstreams({
      counters: { total: 0, healthy: 0, failed: 0 },
      instances: [],
      clusters: {},
    });
    alertStore.info.setTimestamp("123");
    const { container } = renderNavbar();
    expect(
      container.querySelector("span.navbar-brand"),
    ).not.toBeInTheDocument();
  });

  it("navbar-brand shows 15 alerts with totalAlerts=15", () => {
    alertStore.info.setTotalAlerts(15);
    renderNavbar();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("navbar includes 'fixed-top' class by default", () => {
    const { container } = renderNavbar();
    const nav = container.querySelector(".navbar");
    expect(nav?.className.split(" ")).toContain("fixed-top");
  });

  it("navbar includes 'fixed-top' class with fixedTop=true", () => {
    const { container } = renderNavbar(true);
    const nav = container.querySelector(".navbar");
    expect(nav?.className.split(" ")).toContain("fixed-top");
    expect(nav?.className.split(" ")).not.toContain("w-100");
  });

  it("navbar doesn't 'fixed-top' class with fixedTop=false", () => {
    const { container } = renderNavbar(false);
    const nav = container.querySelector(".navbar");
    expect(nav?.className.split(" ")).not.toContain("fixed-top");
    expect(nav?.className.split(" ")).toContain("w-100");
  });

  it("body 'padding-top' style is updated after resize", () => {
    const { rerender } = renderNavbar();
    act(() => {
      resizeCallback([{ contentRect: { width: 100, height: 10 } }]);
    });
    rerender(
      <ThemeContext.Provider value={MockThemeContext}>
        <NavBar
          alertStore={alertStore}
          settingsStore={settingsStore}
          silenceFormStore={silenceFormStore}
        />
      </ThemeContext.Provider>,
    );
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top"),
    ).toBe("18px");

    act(() => {
      resizeCallback([{ contentRect: { width: 100, height: 36 } }]);
    });
    rerender(
      <ThemeContext.Provider value={MockThemeContext}>
        <NavBar
          alertStore={alertStore}
          settingsStore={settingsStore}
          silenceFormStore={silenceFormStore}
        />
      </ThemeContext.Provider>,
    );
    expect(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue("padding-top"),
    ).toBe("44px");
  });

  it("uses mobile idle timeout when IsMobile returns true", () => {
    // Verifies that MobileIdleTimeout is used when IsMobile() returns true (line 61)
    (IsMobile as jest.Mock).mockReturnValue(true);
    renderNavbar();

    expect(useIdleTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: expect.any(Number),
      }),
    );

    const callArgs = (useIdleTimer as jest.Mock).mock.calls[0][0];
    expect(callArgs.timeout).toBeGreaterThan(0);
  });
});
