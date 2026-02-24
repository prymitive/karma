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
  render(
    <ThemeContext.Provider value={MockThemeContext}>
      {ui}
    </ThemeContext.Provider>,
  );

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
});
