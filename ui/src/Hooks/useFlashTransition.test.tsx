import { act, ReactNode } from "react";

import { renderHook } from "@testing-library/react";

import { useInView } from "react-intersection-observer";

import { mockInViewResponse } from "__fixtures__/InView";

import { ThemeContext, ThemeCtx } from "Components/Theme";

import { useFlashTransition } from "./useFlashTransition";

const animationsOffCtx: ThemeCtx = {
  isDark: false,
  reactSelectStyles: {},
  animations: { duration: 0 },
};

const animationsOffWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeContext value={animationsOffCtx}>{children}</ThemeContext>
);

describe("useFlashTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("does nothing when value changes but element is out of viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(false),
    );

    let value = 0;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    value = 1;
    rerender();
    expect(node.className).toBe("");
  });

  it("flashes when value changes and element is in viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    const node = document.createElement("span");
    act(() => result.current.ref(node));
    expect(node.className).toBe("");

    value = 3;
    rerender();
    expect(node.className).toBe("components-animation-flash");
  });

  it("removes the flash class after the animation duration", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    value = 3;
    rerender();
    expect(node.className).toBe("components-animation-flash");

    act(() => jest.advanceTimersByTime(800));
    expect(node.className).toBe("");
  });

  it("does not flash on initial mount", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    const { result, rerender } = renderHook(() => useFlashTransition(1));
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    rerender();
    expect(node.className).toBe("");
  });

  it("flashes when value changes and element moves into viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(false),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    value = 3;
    rerender();
    expect(node.className).toBe("");

    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );
    rerender();
    expect(node.className).toBe("components-animation-flash");
  });

  it("does not flash when animations are disabled", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value), {
      wrapper: animationsOffWrapper,
    });
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    value = 3;
    rerender();
    expect(node.className).toBe("");

    act(() => jest.advanceTimersByTime(800));
    expect(node.className).toBe("");
  });

  it("unmounts cleanly when not flashing", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(false),
    );

    const { unmount } = renderHook(() => useFlashTransition(4));
    unmount();
  });

  it("unmounts cleanly when flashing", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 5;
    const { result, rerender, unmount } = renderHook(() =>
      useFlashTransition(value),
    );
    const node = document.createElement("span");
    act(() => result.current.ref(node));

    value = 6;
    rerender();
    expect(node.className).toBe("components-animation-flash");
    unmount();
  });
});
