import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { MockThemeContextWithoutAnimations } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { TooltipWrapper, TooltipContent } from ".";

describe("TooltipWrapper", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("renders only children", () => {
    const { container } = render(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>,
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
    expect(container.querySelectorAll("div.tooltip")).toHaveLength(0);
  });

  it("uses passed className", () => {
    const { container } = render(
      <TooltipWrapper title="my title" className="foo">
        <span>Hover me</span>
      </TooltipWrapper>,
    );
    expect(container.querySelectorAll("div.foo")).toHaveLength(1);
    expect(container.querySelector("div.foo")?.textContent).toBe("Hover me");
  });

  it("on non-touch devices it renders tooltip on mouseOver and hides on mouseLeave", async () => {
    const { container } = render(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>,
    );

    fireEvent.mouseOver(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(1);

    fireEvent.mouseLeave(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(0);

    await act(async () => {
      jest.runAllTimers();
    });
  });

  it("on touch devices it renders tooltip on touchStart and hides on touchEnd", async () => {
    const { container } = render(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>,
    );

    act(() => {
      const event = new Event("touchstart");
      global.window.dispatchEvent(event);
    });

    fireEvent.touchStart(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(1);

    fireEvent.touchEnd(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(0);

    await act(async () => {
      jest.runAllTimers();
    });
  });

  it("hides the tooltip after click and show again on mouseOver", () => {
    const { container, unmount } = render(
      <TooltipWrapper title="my title">
        <span>Hover me</span>
      </TooltipWrapper>,
    );

    fireEvent.mouseOver(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(1);

    fireEvent.click(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(0);

    fireEvent.mouseLeave(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(0);

    fireEvent.mouseOver(container.firstChild as Element);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.body.querySelectorAll("div.tooltip")).toHaveLength(1);

    unmount();
    act(() => {
      jest.runAllTimers();
    });
  });

  it("TooltipContent renders with empty coordinates when x and y are null", () => {
    const { container } = render(
      <TooltipContent
        title="my title"
        setFloating={jest.fn()}
        strategy="absolute"
        x={null}
        y={null}
      />,
    );
    const tooltip = container.querySelector(".tooltip") as HTMLElement;
    expect(tooltip.style.top).toBe("");
    expect(tooltip.style.left).toBe("");
    expect(tooltip.className).toBe(
      "tooltip tooltip-inner components-animation-tooltip-enter",
    );
  });

  it("TooltipContent has no animation class when animations are disabled", () => {
    const { container } = render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <TooltipContent
          title="my title"
          setFloating={jest.fn()}
          strategy="absolute"
          x={null}
          y={null}
        />
      </ThemeContext>,
    );
    const tooltip = container.querySelector(".tooltip") as HTMLElement;
    expect(tooltip.className).toBe("tooltip tooltip-inner");
  });
});
