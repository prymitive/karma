import React from "react";

import { mount } from "enzyme";

import { TooltipWrapper } from ".";

describe("TooltipWrapper", () => {
  beforeAll(() => {
    jest.useFakeTimers();

    // https://stackoverflow.com/a/60974039/1154047
    const mutationObserverMock = jest.fn(function MutationObserver(callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      // Optionally add a trigger() method to manually trigger a change
      this.trigger = (mockedMutationsList) => {
        callback(mockedMutationsList, this);
      };
    });
    global.MutationObserver = mutationObserverMock;
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

  it("renders tooltip on hover and hides on blur", () => {
    const tree = mount(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>
    );

    tree.simulate("mouseEnter");
    jest.runAllTimers();
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(1);

    tree.simulate("mouseLeave");
    jest.runAllTimers();
    tree.update();
    expect(tree.find("div.tooltip")).toHaveLength(0);
  });
});
