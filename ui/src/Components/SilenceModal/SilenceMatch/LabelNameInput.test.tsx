import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { NewEmptyMatcher, MatcherWithIDT } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { useFetchGet } from "Hooks/useFetchGet";
import { LabelNameInput } from "./LabelNameInput";

let matcher: MatcherWithIDT;

beforeEach(() => {
  matcher = NewEmptyMatcher();
  matcher.name = "cluster";
});

afterEach(() => {
  jest.restoreAllMocks();
  (useFetchGet as jest.MockedFunction<typeof useFetchGetMock>).mockReset();
});

const MountedLabelNameInput = (isValid: boolean) => {
  return mount(<LabelNameInput matcher={matcher} isValid={isValid} />, {
    wrappingComponent: ThemeContext.Provider,
    wrappingComponentProps: { value: MockThemeContext },
  });
};

describe("<LabelNameInput />", () => {
  it("matches snapshot", () => {
    const tree = MountedLabelNameInput(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't renders ValidationError after passed validation", () => {
    // clear the name so placeholder is rendered
    matcher.name = "";
    const tree = MountedLabelNameInput(true);
    expect(toDiffableHtml(tree.html())).toMatch(/Label name/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/fa-exclamation-circle/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/Required/);
  });

  it("renders ValidationError after failed validation", () => {
    // clear the name so placeholder is rendered
    matcher.name = "";
    const tree = MountedLabelNameInput(false);
    expect(toDiffableHtml(tree.html())).not.toMatch(/Label name/);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-exclamation-circle/);
    expect(toDiffableHtml(tree.html())).toMatch(/Required/);
  });

  it("renders suggestions", () => {
    const tree = MountedLabelNameInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("job");
    expect(options.at(1).text()).toBe("instance");
  });

  it("clicking on options updates the matcher", () => {
    const tree = MountedLabelNameInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    const option = tree.find("div.react-select__option").at(0);
    option.simulate("click");
    expect(matcher.name).toBe("job");
  });

  it("populates suggestions on mount", () => {
    MountedLabelNameInput(true);
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGetMock>).mock
        .calls[0][0]
    ).toBe("./labelNames.json");
  });

  it("handles fetch errors when populating suggestions", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedLabelNameInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(0);
  });
});
