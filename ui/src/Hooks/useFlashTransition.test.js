import { renderHook, act } from "@testing-library/react-hooks";

import { useInView } from "react-intersection-observer";

import { useFlashTransition, defaultProps } from "./useFlashTransition";

describe("useFlashTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    useInView.setInView(true);
  });

  it("does nothing when value changes but element is out of viewport", () => {
    useInView.setInView(false);

    let value = 0;
    const { result, rerender } = renderHook(() => useFlashTransition(value));
    expect(result.current.props).toMatchObject(defaultProps);

    value = 1;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);
  });

  it("flashes when value changes and element is in viewport", () => {
    useInView.setInView(true);

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });
  });

  it("flashes when value changes and element moves into viewport", () => {
    useInView.setInView(false);

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject(defaultProps);

    act(() => useInView.setInView(true));
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });
  });

  it("stops flashing props.onEntered is called", () => {
    useInView.setInView(true);

    let value = 2;
    const { result, rerender } = renderHook(() => useFlashTransition(value));

    value = 3;
    rerender();
    expect(result.current.props).toMatchObject({
      ...defaultProps,
      in: true,
      enter: true,
    });

    act(() => result.current.props.onEntered());
    expect(result.current.props).toMatchObject(defaultProps);
  });

  it("unmounts cleanly when not flashing", () => {
    useInView.setInView(false);

    const { unmount } = renderHook(() => useFlashTransition(4));
    unmount();
  });

  it("unmounts cleanly when flashing", () => {
    useInView.setInView(false);

    let value = 5;
    const { rerender, unmount } = renderHook(() => useFlashTransition(value));

    value = 6;
    rerender();
    unmount();
  });
});
