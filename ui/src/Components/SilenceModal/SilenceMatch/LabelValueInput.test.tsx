import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { MockThemeContext } from "__fixtures__/Theme";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherWithIDT,
} from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { StringToOption } from "Common/Select";
import { LabelValueInput } from "./LabelValueInput";

let silenceFormStore: SilenceFormStore;
let matcher: MatcherWithIDT;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
  matcher.name = "cluster";
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedLabelValueInput = (isValid: boolean) => {
  return mount(
    <LabelValueInput
      silenceFormStore={silenceFormStore}
      matcher={matcher}
      isValid={isValid}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<LabelValueInput />", () => {
  it("matches snapshot", () => {
    const tree = MountedLabelValueInput(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("fetches suggestions on mount", () => {
    const tree = MountedLabelValueInput(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);
    expect(useFetchGetMock.fetch.calls[0]).toBe(
      "./labelValues.json?name=cluster"
    );
  });

  it("doesn't fetch suggestions if name is not set", () => {
    matcher.name = "";
    MountedLabelValueInput(true);
    expect(useFetchGetMock.fetch.calls).toHaveLength(0);
  });

  it("doesn't renders ValidationError after passed validation", () => {
    const tree = MountedLabelValueInput(true);
    expect(toDiffableHtml(tree.html())).not.toMatch(/fa-exclamation-circle/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/Required/);
  });

  it("renders ValidationError after failed validation", () => {
    const tree = MountedLabelValueInput(false);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-exclamation-circle/);
    expect(toDiffableHtml(tree.html())).toMatch(/Required/);
  });

  it("renders suggestions", () => {
    const tree = MountedLabelValueInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(3);
    expect(options.at(0).text()).toBe("dev");
    expect(options.at(1).text()).toBe("staging");
    expect(options.at(2).text()).toBe("prod");
  });

  it("clicking on options appends them to matcher.values", () => {
    const tree = MountedLabelValueInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.values).toHaveLength(2);
    expect(matcher.values).toContainEqual(StringToOption("dev"));
    expect(matcher.values).toContainEqual(StringToOption("staging"));
  });

  it("selecting one option doesn't force matcher.isRegex=true", () => {
    const tree = MountedLabelValueInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(false);
  });

  it("selecting one option when matcher.isRegex=true doesn't change it back to false", () => {
    matcher.isRegex = true;
    const tree = MountedLabelValueInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    expect(matcher.isRegex).toBe(true);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(true);
  });

  it("selecting multiple options forces matcher.isRegex=true", () => {
    const tree = MountedLabelValueInput(true);
    tree.find("input").simulate("change", { target: { value: "f" } });
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.isRegex).toBe(true);
  });

  it("removing last value sets matcher.values to []", () => {
    matcher.values = [StringToOption("dev"), StringToOption("staging")];
    const tree = MountedLabelValueInput(true);

    tree.find(".react-select__multi-value__remove").at(0).simulate("click");
    expect(matcher.values).toHaveLength(1);

    tree.find(".react-select__multi-value__remove").simulate("click");
    expect(matcher.values).toHaveLength(0);
    expect(matcher.values).toEqual([]);
  });
});
