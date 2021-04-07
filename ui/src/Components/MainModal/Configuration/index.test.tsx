import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { Configuration } from ".";

beforeEach(() => {
  fetchMock.reset();
  fetchMock.mock("*", {
    status: 200,
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.reset();
});

describe("<Configuration />", () => {
  it("matches snapshot", () => {
    const settingsStore = new Settings(null);
    const tree = mount(
      <ThemeContext.Provider value={MockThemeContext}>
        <Configuration settingsStore={settingsStore} defaultIsOpen={true} />
      </ThemeContext.Provider>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
