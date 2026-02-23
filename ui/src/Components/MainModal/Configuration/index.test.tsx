import { render } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { MockThemeContext } from "__fixtures__/Theme";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { Configuration } from ".";

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.route("*", {
    status: 200,
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.mockReset();
});

describe("<Configuration />", () => {
  it("matches snapshot", () => {
    const settingsStore = new Settings(null);
    const { asFragment } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Configuration settingsStore={settingsStore} defaultIsOpen={true} />
      </ThemeContext.Provider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
