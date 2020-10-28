import { renderHook, act } from "@testing-library/react-hooks";

import { useInView } from "react-intersection-observer";

import { useFlashTransition, defaultProps } from "./useFlashTransition";

describe("useFlashTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("does nothing when value changes but element is out of viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    let value = 0;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    expect(result.current.props).toMatchObject(defaultProps);

    value = 1;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);
  });

  it("flashes when value changes and element is in viewport", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      true,
    ] as any);

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
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);

    act(() => {
      (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
        jest.fn(),
        true,
      ] as any);
    });
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });
  });

  it("stops flashing props.onEntered is called", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      true,
    ] as any);

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });

    act(() => (result.current.props as any).onEntered());
    expect(result.current.props).toMatchObject(defaultProps);
  });

  it("unmounts cleanly when not flashing", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    const { unmount } = renderHook(() => useFlashTransition(4));
    unmount();
  });

  it("unmounts cleanly when flashing", () => {
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    let value = 5;
    const { rerender, unmount } = renderHook(() => useFlashTransition(value));

    value = 6;
    rerender();
    unmount();
  });
});
