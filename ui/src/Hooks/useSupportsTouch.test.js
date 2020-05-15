import { renderHook, act } from "@testing-library/react-hooks";

import { useSupportsTouch } from "./useSupportsTouch";

describe("useSupportsTouch", () => {
  it("returns false by default", () => {
    const { result } = renderHook(() => useSupportsTouch());
    expect(result.current).toBe(false);
  });

  it("returns true after touchStart event", () => {
    const { waitForNextUpdate, result } = renderHook(() => useSupportsTouch());
    expect(result.current).toBe(false);

    act(() => {
      const event = new Event("touchstart");
      global.window.dispatchEvent(event);
    });

    waitForNextUpdate();

    expect(result.current).toBe(true);
  });
});
