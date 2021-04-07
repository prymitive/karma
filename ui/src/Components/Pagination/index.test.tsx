import { mount } from "enzyme";

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

    const tree = mount(
      <PageSelect
        totalPages={4}
        maxPerPage={5}
        totalItemsCount={17}
        setPageCallback={setPageCallback}
      />
    );
    tree.simulate("focus");

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

  it("renders 5 page range on desktop", () => {
    global.innerWidth = 1024;
    const tree = mount(
      <PageSelect
        totalPages={7}
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
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />
    );
    expect(tree.find(".page-link")).toHaveLength(5);
  });

  it("resets page if activePage >= totalPages", () => {
    const setPageCallback = jest.fn();
    const tree = mount(
      <PageSelect
        initialPage={3}
        totalPages={7}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={setPageCallback}
      />
    );
    expect(tree.find(".page-item").at(3).hasClass("active")).toBe(true);

    tree.setProps({ totalPages: 2 });
    tree.update();
    expect(tree.find(".page-item").at(2).hasClass("active")).toBe(true);
    expect(setPageCallback).toHaveBeenLastCalledWith(2);

    tree.setProps({ totalPages: 5 });
    tree.update();
    expect(tree.find(".page-item").at(2).hasClass("active")).toBe(true);
  });
});
