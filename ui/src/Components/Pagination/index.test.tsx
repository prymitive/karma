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
      />,
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

  it("calls setPageCallback on button press", () => {
    const setPageCallback = jest.fn();

    const tree = mount(
      <PageSelect
        totalPages={15}
        maxPerPage={5}
        totalItemsCount={15 * 5}
        setPageCallback={setPageCallback}
      />,
    );
    tree.simulate("focus");

    for (const elem of [
      { index: 0, page: 1, label: "" }, // <<
      { index: 1, page: 1, label: "" }, // <
      { index: 2, page: 1, label: "1" }, // <<12345>> -> <<12345>>
      { index: 3, page: 2, label: "2" }, // <<12345>> -> <<12345>>
      { index: 4, page: 3, label: "3" }, // <<12345>> -> <<12345>>
      { index: 5, page: 4, label: "4" }, // <<12345>> -> <<23456>>
      { index: 4, page: 4, label: "4" }, //  <<23456>> -> <<23456>>
      { index: 0, page: 1, label: "" }, //  <<23456>> -> <<12345>>
      { index: 6, page: 5, label: "5" }, //  <<12345>> -> <<34567>>
      { index: 7, page: 6, label: "" }, //  <<34567>> -> <<45678>>
      { index: 1, page: 5, label: "" }, //  <<34567>> -> <<23456>>
      { index: 8, page: 15, label: "" }, //  <<23456>> -> <<end>>
    ]) {
      expect(tree.find("button.page-link").at(elem.index).text()).toBe(
        elem.label,
      );
      tree.find("button.page-link").at(elem.index).simulate("click");
      expect(setPageCallback).toHaveBeenLastCalledWith(elem.page);
    }
  });

  it("doesn't render anything if totalItemsCount <= maxPerPage", () => {
    global.innerWidth = 1024;
    const tree = mount(
      <PageSelect
        totalPages={1}
        maxPerPage={5}
        totalItemsCount={5}
        setPageCallback={jest.fn()}
      />,
    );
    expect(tree.find(".page-link")).toHaveLength(0);
  });

  it("renders 5 page range on desktop", () => {
    global.innerWidth = 1024;
    const tree = mount(
      <PageSelect
        totalPages={7}
        maxPerPage={5}
        totalItemsCount={35}
        setPageCallback={jest.fn()}
      />,
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
      />,
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
      />,
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
