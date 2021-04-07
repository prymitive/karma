import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { TooltipWrapper } from ".";

describe("TooltipWrapper", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("renders only children", () => {
    const tree = mount(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>
    );
    expect(tree.text()).toBe("Hover me");
    expect(tree.find("div.tooltip")).toHaveLength(0);
  });

  it("uses passed className", () => {
    const tree = mount(
      <TooltipWrapper title="my title" className="foo">
        <span>Hover me</span>
      </TooltipWrapper>
    );
    expect(tree.find("div.foo")).toHaveLength(1);
    expect(tree.find("div.foo").text()).toBe("Hover me");
  });

  it("on non-touch devices it renders tooltip on mouseOver and hides on mouseLeave", () => {
    const tree = mount(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>
    );

    tree.simulate("mouseOver");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(1);

    tree.simulate("mouseLeave");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(0);
  });

  it("on touch devices it renders tooltip on touchStart and hides on touchEnd", () => {
    const tree = mount(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>
    );

    act(() => {
      const event = new Event("touchstart");
      global.window.dispatchEvent(event);
    });
    tree.update();

    tree.simulate("touchStart");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(1);

    tree.simulate("touchEnd");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(0);
  });

  it("hides the tooltip after click and show again on mouseOver", () => {
    const tree = mount(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>
    );

    tree.simulate("mouseOver");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(1);

    tree.simulate("click");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(0);

    tree.simulate("mouseLeave");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(0);

    tree.simulate("mouseOver");
    act(() => {
      jest.runAllTimers();
    });
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(1);

    tree.unmount();
    act(() => {
      jest.runAllTimers();
    });
  });
});
