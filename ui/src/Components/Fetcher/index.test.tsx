import { act } from "react";

import { render, fireEvent } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { EmptyAPIResponse } from "__fixtures__/Fetch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

import { Fetcher, Dots } from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let fetchSpy: any;
let requestAnimationFrameSpy: any;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

  alertStore = new AlertStore(["label=value"]);
  fetchSpy = jest
    .spyOn(alertStore, "fetchWithThrottle")
    .mockImplementation(() => {
      alertStore.status.setIdle();
      return new Promise((success) => {
        success();
      });
    });

  settingsStore = new Settings(null);
  settingsStore.fetchConfig.setInterval(30);

  requestAnimationFrameSpy = jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb: any) => {
      cb();
      return 0;
    });
});

afterEach(() => {
  alertStore.status.resume();
  requestAnimationFrameSpy.mockRestore();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();
  fetchMock.mockReset();
});

const MockEmptyAPIResponseWithoutFilters = () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetchMock.mockReset();
  fetchMock.route("*", {
    status: 200,
    body: JSON.stringify(response),
  });
};

describe("<Fetcher />", () => {
  it("changing interval changes how often fetch is called", () => {
    settingsStore.fetchConfig.setInterval(1);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 3 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    settingsStore.fetchConfig.setInterval(600);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 6 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 38 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 100 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 702 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("calls alertStore.fetchWithThrottle on mount", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls alertStore.fetchWithThrottle again after filter change", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    const { rerender } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    alertStore.filters.setFilterValues([]);
    rerender(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps calling alertStore.fetchWithThrottle every minute", () => {
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 62 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 124 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 186 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("calls alertStore.fetchWithThrottle with empty sort arguments when sortOrder=default", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith("", false, "", "", false, {}, 5, {});
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(false);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "disabled",
      "",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(true);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "disabled",
      "",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("startsAt");
    settingsStore.gridConfig.setSortReverse(false);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "startsAt",
      "",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("startsAt");
    settingsStore.gridConfig.setSortReverse(true);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "startsAt",
      "",
      true,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=cluster reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("cluster");
    settingsStore.gridConfig.setSortReverse(false);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "label",
      "cluster",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=job reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("job");
    settingsStore.gridConfig.setSortReverse(true);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "label",
      "job",
      true,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=instance reverseSort=null", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("instance");
    settingsStore.gridConfig.setSortReverse(null);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "label",
      "instance",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with gridLabel=cluster gridSortReverse=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("cluster");
    settingsStore.multiGridConfig.setGridSortReverse(false);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "cluster",
      false,
      "",
      "",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with gridLabel=cluster gridSortReverse=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("cluster");
    settingsStore.multiGridConfig.setGridSortReverse(true);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "cluster",
      true,
      "",
      "",
      false,
      {},
      5,
      {},
    );
  });

  it("calls alertStore.fetchWithThrottle with gridLabel= gridSortReverse=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("");
    settingsStore.multiGridConfig.setGridSortReverse(true);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith("", true, "", "", false, {}, 5, {});
  });

  it("calls alertStore.fetchWithThrottle with limits set", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("");
    settingsStore.multiGridConfig.setGridSortReverse(false);
    alertStore.ui.setGridGroupLimit("old", "bar", 10);
    alertStore.ui.setGridGroupLimit("foo", "bar", 5);
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledWith(
      "",
      false,
      "",
      "",
      false,
      { bar: 5 },
      5,
      {},
    );
  });

  it("internal timer is null after unmount", () => {
    const { unmount } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      settingsStore.gridConfig.setSortReverse(
        !settingsStore.gridConfig.config.reverseSort,
      );
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("doesn't fetch on mount when paused", () => {
    alertStore.status.pause();
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("doesn't fetch on update when paused", () => {
    alertStore.status.pause();
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    settingsStore.gridConfig.setSortReverse(
      !settingsStore.gridConfig.config.reverseSort,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("fetches on update when resumed", () => {
    // Verifies fetch is triggered when settings change after resume
    alertStore.status.pause();
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    act(() => {
      alertStore.status.resume();
      settingsStore.gridConfig.setSortReverse(
        !settingsStore.gridConfig.config.reverseSort,
      );
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches on resume", () => {
    // Verifies fetch is triggered on resume after pause
    alertStore.status.pause();
    render(<Fetcher alertStore={alertStore} settingsStore={settingsStore} />);
    act(() => {
      alertStore.status.resume();
    });
    jest.setSystemTime(
      new Date(Date.UTC(2000, 1, 1, 0, 0, 0)).getTime() + 2 * 1000,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("<Fetcher /> children", () => {
  it("renders Dots when countdown is in progress", () => {
    const { container } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    expect(container.querySelectorAll("div.components-fetcher")).toHaveLength(
      1,
    );
  });

  it("doesn't render any children when upgrade is needed", () => {
    act(() => {
      alertStore.info.setUpgradeNeeded(true);
    });
    const { container } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    expect(container.querySelector("div.navbar-brand")?.children).toHaveLength(
      0,
    );
  });

  it("renders PauseButton when paused", () => {
    const { container } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    act(() => {
      alertStore.status.pause();
    });
    expect(container.innerHTML).toMatch(/fa-pause/);
  });

  it("renders PauseButton when paused and hovered", () => {
    const { container } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    act(() => {
      alertStore.status.pause();
    });
    const navbarBrand = container.querySelector(".navbar-brand");
    fireEvent.mouseEnter(navbarBrand!);
    expect(container.innerHTML).toMatch(/fa-pause/);

    fireEvent.mouseLeave(navbarBrand!);
    expect(container.innerHTML).toMatch(/fa-pause/);
  });

  it("renders PlayButton when hovered", () => {
    const { container } = render(
      <Fetcher alertStore={alertStore} settingsStore={settingsStore} />,
    );
    const navbarBrand = container.querySelector(".navbar-brand");
    fireEvent.mouseEnter(navbarBrand!);
    expect(container.innerHTML).toMatch(/fa-play/);

    fireEvent.mouseLeave(navbarBrand!);
    expect(container.querySelectorAll("div.components-fetcher")).toHaveLength(
      1,
    );
  });
});

describe("<Dots />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(<Dots alertStore={alertStore} dots={8} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("adds 'fetching' class when fetching data", () => {
    act(() => {
      alertStore.status.setFetching();
    });
    const { container } = render(<Dots alertStore={alertStore} dots={8} />);
    expect(
      container
        .querySelector("div.components-fetcher")
        ?.classList.contains("fetching"),
    ).toBe(true);
  });

  it("adds 'processing' class when processing fetched data", () => {
    act(() => {
      alertStore.status.setProcessing();
    });
    const { container } = render(<Dots alertStore={alertStore} dots={8} />);
    expect(
      container
        .querySelector("div.components-fetcher")
        ?.classList.contains("processing"),
    ).toBe(true);
  });

  it("adds 'retrying' class when fetch needs a retry", () => {
    act(() => {
      alertStore.info.setIsRetrying();
    });
    const { container } = render(<Dots alertStore={alertStore} dots={8} />);
    expect(
      container
        .querySelector("div.components-fetcher")
        ?.classList.contains("retrying"),
    ).toBe(true);
  });
});
