import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject
} from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles
} from "Components/Theme/ReactSelect";
import { LabelValueInput } from "./LabelValueInput";

let silenceFormStore;
let matcher;

beforeAll(() => {
  fetch.mockResponse(JSON.stringify([]));
});

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
  matcher.name = "name";
  matcher.suggestions.names = [
    MatcherValueToObject("job"),
    MatcherValueToObject("cluster")
  ];
  matcher.suggestions.values = [
    MatcherValueToObject("foo"),
    MatcherValueToObject("bar")
  ];
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedLabelValueInput = isValid => {
  return mount(
    <ThemeContext.Provider
      value={{
        reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light)
      }}
    >
      <LabelValueInput
        silenceFormStore={silenceFormStore}
        matcher={matcher}
        isValid={isValid}
      />
    </ThemeContext.Provider>
  );
};

const ValidateSuggestions = () => {
  const tree = MountedLabelValueInput(true);
  // click on the react-select component doesn't seem to trigger options
  // rendering in tests, so change the input instead
  tree.find("input").simulate("change", { target: { value: "f" } });
  return tree;
};

describe("<LabelValueInput />", () => {
  it("matches snapshot", () => {
    const tree = MountedLabelValueInput(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
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
    const tree = ValidateSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("foo");
    expect(options.at(1).text()).toBe("bar");
  });

  it("clicking on options appends them to matcher.values", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.values).toHaveLength(2);
    expect(matcher.values).toContainEqual(MatcherValueToObject("foo"));
    expect(matcher.values).toContainEqual(MatcherValueToObject("bar"));
  });

  it("selecting one option doesn't force matcher.isRegex=true", () => {
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(false);
  });

  it("selecting one option when matcher.isRegex=true changes it back to false", () => {
    matcher.isRegex = true;
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(true);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(false);
  });

  it("selecting multiple options forces matcher.isRegex=true", () => {
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("div.react-select__option");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.isRegex).toBe(true);
  });

  it("removing last value sets matcher.values to []", () => {
    matcher.values = [MatcherValueToObject("foo"), MatcherValueToObject("bar")];
    const tree = MountedLabelValueInput(true);

    tree
      .find(".react-select__multi-value__remove")
      .at(0)
      .simulate("click");
    expect(matcher.values).toHaveLength(1);

    tree.find(".react-select__multi-value__remove").simulate("click");
    expect(matcher.values).toHaveLength(0);
    expect(matcher.values).toEqual([]);
  });
});
