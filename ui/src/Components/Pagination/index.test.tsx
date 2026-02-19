import { render, fireEvent } from "@testing-library/react";

import { PressKey } from "__fixtures__/PressKey";
import { PageSelect } from ".";

let originalInnerWidth: number;

declare let global: any;

beforeAll(() => {
  originalInnerWidth = global.innerWidth;
});

beforeEach(() => {
  global.innerWidth = originalInnerWidth;
});

afterEach(() => {
  global.innerWidth = originalInnerWidth;
});

describe("<PageSelect />", () => {
  it("calls setPageCallback on arrow key press", () => {
    const setPageCallback = jest.fn();

    const { container } = render(
      <PageSelect
        totalPages={4}
        maxPerPage={5}
        totalItemsCount={17}
        setPageCallback={setPageCallback}
      />,
    );
    fireEvent.focus(container.firstChild as Element);

    PressKey("ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    PressKey("ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(3);

    PressKey("ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(4);

    PressKey("ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(4);

    PressKey("ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(3);

    PressKey("ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    PressKey("ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(1);

    PressKey("ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(1);
  });

  it("calls setPageCallback on button press", () => {
    const setPageCallback = jest.fn();

    const { container } = render(
      <PageSelect
        totalPages={15}
        maxPerPage={5}
        totalItemsCount={15 * 5}
        setPageCallback={setPageCallback}
      />,
    );
    fireEvent.focus(container.firstChild as Element);

    for (const elem of [
      { index: 0, page: 1, label: "" },
      { index: 1, page: 1, label: "" },
      { index: 2, page: 1, label: "1" },
      { index: 3, page: 2, label: "2" },
      { index: 4, page: 3, label: "3" },
      { index: 5, page: 4, label: "4" },
      { index: 4, page: 4, label: "4" },
      { index: 0, page: 1, label: "" },
      { index: 6, page: 5, label: "5" },
      { index: 7, page: 6, label: "" },
      { index: 1, page: 5, label: "" },
      { index: 8, page: 15, label: "" },
    ]) {
      const buttons = container.querySelectorAll("button.page-link");
      expect(buttons[elem.index].textContent).toBe(elem.label);
      fireEvent.click(buttons[elem.index]);
      expect(setPageCallback).toHaveBeenLastCalledWith(elem.page);
    }
  });

  it("doesn't render anything if totalItemsCount <= maxPerPage", () => {
    global.innerWidth = 1024;
    const { container } = render(
      <PageSelect
        totalPages={1}
        maxPerPage={5}
        totalItemsCount={5}
        setPageCallback={jest.fn()}
      />,
    );
    expect(container.querySelectorAll(".page-link")).toHaveLength(0);
  });

  it("renders 5 page range on desktop", () => {
    global.innerWidth = 1024;
    const { container } = render(
      <PageSelect
        totalPages={7}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />,
    );
    expect(container.querySelectorAll(".page-link")).toHaveLength(7);
  });

  it("renders 3 page range on mobile", () => {
    global.innerWidth = 760;
    const { container } = render(
      <PageSelect
        totalPages={7}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />,
    );
    expect(container.querySelectorAll(".page-link")).toHaveLength(5);
  });

  it("resets page if activePage >= totalPages", () => {
    const setPageCallback = jest.fn();
    const { container, rerender } = render(
      <PageSelect
        initialPage={3}
        totalPages={7}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={setPageCallback}
      />,
    );
    expect(
      container.querySelectorAll(".page-item")[3].classList.contains("active"),
    ).toBe(true);

    rerender(
      <PageSelect
        initialPage={3}
        totalPages={2}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={setPageCallback}
      />,
    );
    expect(
      container.querySelectorAll(".page-item")[2].classList.contains("active"),
    ).toBe(true);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    rerender(
      <PageSelect
        initialPage={3}
        totalPages={5}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={setPageCallback}
      />,
    );
    expect(
      container.querySelectorAll(".page-item")[2].classList.contains("active"),
    ).toBe(true);
  });
});
