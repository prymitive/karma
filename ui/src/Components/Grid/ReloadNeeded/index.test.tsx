import { act } from "react-dom/test-utils";

import { render } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { ReloadNeeded } from ".";

declare let window: any;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();

  delete window.location;
  window.location = { reload: jest.fn() };
});

afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
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

  it("calls window.location.reload after timer is done", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});

    renderWithTheme(<ReloadNeeded reloadAfter={100000000} />);

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(reloadSpy).toBeCalled();
  });

  it("stops calling window.location.reload after unmount", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});

    const { unmount } = renderWithTheme(
      <ReloadNeeded reloadAfter={100000000} />,
    );
    expect(reloadSpy).not.toBeCalled();

    act(() => {
      unmount();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(reloadSpy).not.toBeCalled();
  });
});
