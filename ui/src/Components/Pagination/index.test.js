import React from "react";

import { mount } from "enzyme";

import { PressKey } from "__mocks__/KeyPress";
import { PageSelect } from ".";

let originalInnerWidth;

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

    const tree = mount(
      <PageSelect
        totalPages={4}
        activePage={1}
        maxPerPage={5}
        totalItemsCount={17}
        setPageCallback={setPageCallback}
      />
    );
    tree.simulate("focus");

    setPageCallback.mockImplementation((val) =>
      tree.setProps({ activePage: val })
    );

    PressKey(tree, "ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    PressKey(tree, "ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(3);

    PressKey(tree, "ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(4);

    PressKey(tree, "ArrowRight", 39);
    expect(setPageCallback).toHaveBeenLastCalledWith(4);

    PressKey(tree, "ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(3);

    PressKey(tree, "ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    PressKey(tree, "ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(1);

    PressKey(tree, "ArrowLeft", 37);
    expect(setPageCallback).toHaveBeenLastCalledWith(1);
  });

  it("renders 5 page range on desktop", () => {
    global.innerWidth = 1024;
    const tree = mount(
      <PageSelect
        totalPages={7}
        activePage={1}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />
    );
    expect(tree.find(".page-link")).toHaveLength(7);
  });

  it("renders 3 page range on mobile", () => {
    global.innerWidth = 760;
    const tree = mount(
      <PageSelect
        totalPages={7}
        activePage={1}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />
    );
    expect(tree.find(".page-link")).toHaveLength(5);
  });
});
