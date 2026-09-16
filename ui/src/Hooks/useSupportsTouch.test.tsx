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

    act(() => {
      global.window.dispatchEvent(new Event("touchstart"));
    });
    expect(result.current).toBe(true);
  });

  it("shares one touch listener between subscribers", () => {
    // Subscribe twice before removing both subscriptions.
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => [
      useSupportsTouch(),
      useSupportsTouch(),
    ]);

    const added = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "touchstart",
    );
    expect(added).toHaveLength(1);
    expect(added[0][0]).toBe("touchstart");
    expect(typeof added[0][1]).toBe("function");

    unmount();
    const removed = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === "touchstart",
    );
    expect(removed).toHaveLength(1);
    expect(removed[0][0]).toBe("touchstart");
    expect(removed[0][1]).toBe(added[0][1]);
  });
});
