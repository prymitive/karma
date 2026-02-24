import { act } from "react";

import { renderHook } from "@testing-library/react";

import { useSupportsTouch } from "./useSupportsTouch";

describe("useSupportsTouch", () => {
  it("returns false by default", () => {
    const { result } = renderHook(() => useSupportsTouch());
    expect(result.current).toBe(false);
  });

  it("returns true after touchStart event", () => {
    const { result } = renderHook(() => useSupportsTouch());
    expect(result.current).toBe(false);

    act(() => {
      const event = new Event("touchstart");
      global.window.dispatchEvent(event);
    });

    expect(result.current).toBe(true);
  });
});
