import { act } from "react";

import { renderHook } from "@testing-library/react";

import { useInView } from "react-intersection-observer";

import { mockInViewResponse } from "__fixtures__/InView";

import { useFlashTransition, defaultProps } from "./useFlashTransition";

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
    expect(result.current.props).toMatchObject(defaultProps);

    value = 1;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);
  });

  it("flashes when value changes and element is in viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    expect(result.current.props).toMatchObject(defaultProps);

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });
  });

  it("flashes when value changes and element moves into viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(false),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);

    act(() => {
      (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
        mockInViewResponse(true),
      );
    });
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });
  });

  it("stops flashing props.onEntered is called", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue(
      mockInViewResponse(true),
    );

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });

    act(() => result.current.props.onEntered!({} as HTMLElement, false));
    expect(result.current.props).toMatchObject(defaultProps);
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
      mockInViewResponse(false),
    );

    let value = 5;
    const { rerender, unmount } = renderHook(() => useFlashTransition(value));

    value = 6;
    rerender();
    unmount();
  });
});
