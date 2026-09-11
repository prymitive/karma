import { act } from "react";

import { render, screen } from "@testing-library/react";

import { useNow } from "./useNow";

const Now = () => {
  const now = useNow();
  return <span data-testid="now">{now}</span>;
};

describe("useNow", () => {
  it("returns the current time", () => {
    const before = Date.now();
    render(<Now />);
    const value = Number(screen.getByTestId("now").textContent);
    // The value is refreshed when the component subscribes, so it sits
    // between the time before render and the time of the assert.
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(Date.now());
  });

  it("updates on every tick", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    render(<Now />);

    // Advancing the timers by one tick also advances the system clock,
    // so the tick reads the time 30s after the jump below.
    act(() => {
      jest.setSystemTime(new Date("2020-01-01T00:01:00Z"));
      jest.advanceTimersByTime(30 * 1000);
    });
    expect(screen.getByTestId("now").textContent).toBe(
      String(new Date("2020-01-01T00:01:30Z").getTime()),
    );
    jest.useRealTimers();
  });

  it("shares one interval between all subscribers", () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    render(
      <>
        <Now />
        <Now />
      </>,
    );
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
    jest.useRealTimers();
  });

  it("stops the interval after the last subscriber unmounts", () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    const { unmount } = render(<Now />);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    // No new interval starts while there are no subscribers.
    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    jest.useRealTimers();
  });
});
