import { act } from "react";

import { render } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { ReloadNeeded } from ".";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeContext value={MockThemeContext}>{ui}</ThemeContext>);

describe("<ReloadNeeded />", () => {
  it("matches snapshot", () => {
    const { asFragment } = renderWithTheme(
      <ReloadNeeded reloadAfter={100000000} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("sets up timer to reload after specified duration", () => {
    // Verifies that a timer is set up for the reload duration
    const timersBefore = jest.getTimerCount();
    renderWithTheme(<ReloadNeeded reloadAfter={100000000} />);
    expect(jest.getTimerCount()).toBeGreaterThan(timersBefore);
  });

  it("clears timer on unmount", () => {
    // Verifies that timer is cleared when component unmounts
    const { unmount } = renderWithTheme(
      <ReloadNeeded reloadAfter={100000000} />,
    );
    const timersAfterRender = jest.getTimerCount();
    expect(timersAfterRender).toBeGreaterThan(0);

    act(() => {
      unmount();
    });
    expect(jest.getTimerCount()).toBeLessThan(timersAfterRender);
  });

  it("reloads the page after the timer fires", () => {
    // The jsdom environment cannot navigate, so a reload logs an error;
    // the spy catches it and proves that the reload was attempted.
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderWithTheme(<ReloadNeeded reloadAfter={5000} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    // The error comes from jsdom's own realm, so it cannot be compared
    // by value; the message is asserted in full instead.
    expect(consoleSpy.mock.calls).toHaveLength(1);
    expect((consoleSpy.mock.calls[0][0] as Error).message).toBe(
      "Not implemented: navigation (except hash changes)",
    );
    consoleSpy.mockRestore();
  });
});
