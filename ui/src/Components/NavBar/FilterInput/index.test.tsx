import { act } from "react";

import { render, fireEvent } from "@testing-library/react";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { FilterInput } from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let originalInnerWidth: number;

declare let global: any;

beforeAll(() => {
  originalInnerWidth = global.window.innerWidth;
});

beforeEach(() => {
  global.window.innerWidth = originalInnerWidth;
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
  global.window.innerWidth = originalInnerWidth;
});

const renderInput = () => {
  return render(
    <FilterInput alertStore={alertStore} settingsStore={settingsStore} />,
  );
};

describe("<FilterInput />", () => {
  it("matches snapshot with no filters", () => {
    const { asFragment } = renderInput();
    expect(asFragment()).toMatchSnapshot();
    expect(alertStore.filters.values).toHaveLength(0);
  });

  it("matches snapshot with some filters", () => {
    alertStore.filters.setFilterValues([
      NewUnappliedFilter("foo=bar"),
      NewUnappliedFilter("baz!=bar"),
    ]);
    const { asFragment } = renderInput();
    expect(asFragment()).toMatchSnapshot();
    expect(alertStore.filters.values).toHaveLength(2);
  });

  it("input gets focus by default on desktop", () => {
    global.window.innerWidth = 768;
    const { container } = renderInput();
    expect(
      container
        .querySelector("div.components-filterinput-outer")
        ?.classList.contains("bg-focused"),
    ).toBe(true);
  });

  it("input doesn't get focus by default on mobile", () => {
    global.window.innerWidth = 767;
    const { container } = renderInput();
    expect(
      container
        .querySelector("div.components-filterinput-outer")
        ?.classList.contains("bg-focused"),
    ).toBe(false);
  });

  it("onChange should modify inputStore.value", () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "foo=bar" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      (
        container.querySelector(
          "input.components-filterinput-wrapper",
        ) as HTMLInputElement
      )?.value,
    ).toBe("foo=bar");
  });

  it("submit should modify alertStore.filters", () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    const form = container.querySelector("form");

    fireEvent.change(input!, { target: { value: "foo=bar" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(alertStore.filters.values).toHaveLength(0);
    fireEvent.submit(form!);
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("foo=bar"),
    );
  });

  it("submit should be no-op if input value is empty", () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    const form = container.querySelector("form");
    fireEvent.change(input!, { target: { value: "" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(alertStore.filters.values).toHaveLength(0);
    fireEvent.submit(form!);
    expect(alertStore.filters.values).toHaveLength(0);
  });

  it("clicking on form-control div focuses input", () => {
    const { container } = renderInput();
    const formControl = container.querySelector("div.form-control");
    fireEvent.click(formControl!);
    expect(
      container
        .querySelector("div.components-filterinput-outer")
        ?.classList.contains("bg-focused"),
    ).toBe(true);
  });

  it("clicking input changes background color", () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.click(input!);
    expect(container.innerHTML).toMatch(/bg-focused/);
  });

  it("focusing input changes background color", () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.focus(input!);
    expect(container.innerHTML).toMatch(/bg-focused/);
  });

  it("focusing form changes background color", () => {
    const { container } = renderInput();
    const input = container.querySelector(".form-control input");
    fireEvent.focus(input!);
    expect(container.innerHTML).toMatch(/bg-focused/);
  });

  it("bluring input changes background color", async () => {
    const { container, unmount } = renderInput();
    const input = container.querySelector(".form-control input");
    fireEvent.change(input!, { target: { value: "cluster" } });
    fireEvent.blur(input!);
    expect(container.innerHTML).not.toMatch(/bg-focused/);
    unmount();
  });
});

describe("<FilterInput autocomplete />", () => {
  it("fetches suggestions on input change", async () => {
    const { container, unmount } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "cluster" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(useFetchGetMock.fetch.calls).toHaveLength(1);
    expect(useFetchGetMock.fetch.calls[0]).toContain(
      "./autocomplete.json?term=cluster",
    );
    unmount();
  });

  it("doesn't fetch any suggestion if the input value is empty", () => {
    const { container, unmount } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(useFetchGetMock.fetch.calls).toHaveLength(0);
    unmount();
  });

  it("highlighting a suggestion makes it active", async () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "cluster" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.focus(input!);

    fireEvent.keyDown(input!, { keyCode: 40, key: "ArrowDown" });
    expect(container.querySelector(".dropdown-item")?.outerHTML).toMatch(
      /active/,
    );
  });

  it("handles invalid regexp values", async () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "foo(" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.focus(input!);

    fireEvent.keyDown(input!, { keyCode: 40, key: "ArrowDown" });
    expect(container.querySelector(".dropdown-item")?.outerHTML).toMatch(
      /active/,
    );
  });

  it("clicking on a suggestion adds it to filters", async () => {
    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "cluster" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.focus(input!);

    const suggestions = container.querySelectorAll(".dropdown-item");
    const suggestion = suggestions[1];
    expect(suggestion?.textContent).toBe("cluster=prod");
    fireEvent.click(suggestion!);
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject({
      raw: "cluster=prod",
    });
  });

  it("handles failed suggestion fetches", async () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const { container } = renderInput();
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "cluster" } });
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });
});
