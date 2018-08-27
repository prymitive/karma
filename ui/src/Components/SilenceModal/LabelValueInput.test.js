import React from "react";

import { shallow, mount } from "enzyme";

import { NewEmptyMatcher, MatcherValueToObject } from "Stores/SilenceFormStore";
import { LabelValueInput } from "./LabelValueInput";

let matcher;

beforeEach(() => {
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

const ShallowLabelValueInput = () => {
  return shallow(<LabelValueInput matcher={matcher} />);
};

const MountedLabelValueInput = () => {
  return mount(<LabelValueInput matcher={matcher} />);
};

const ValidateSuggestions = () => {
  const tree = MountedLabelValueInput();
  // click on the react-select component doesn't seem to trigger options
  // rendering in tests, so change the input instead
  tree.find("input").simulate("change", { target: { value: "f" } });
  return tree;
};

describe("<LabelValueInput />", () => {
  it("matches snapshot", () => {
    const tree = ShallowLabelValueInput();
    expect(tree).toMatchSnapshot();
  });

  it("renders suggestions", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("[role='option']");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("foo");
    expect(options.at(1).text()).toBe("bar");
  });

  it("clicking on options appends them to matcher.values", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("[role='option']");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.values).toHaveLength(2);
    expect(matcher.values).toContainEqual(MatcherValueToObject("foo"));
    expect(matcher.values).toContainEqual(MatcherValueToObject("bar"));
  });

  it("selecting one option doesn't force matcher.isRegex=true", () => {
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("[role='option']");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(false);
  });

  it("selecting one option when matcher.isRegex=true changes it back to false", () => {
    matcher.isRegex = true;
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(true);
    const options = tree.find("[role='option']");
    options.at(0).simulate("click");
    expect(matcher.isRegex).toBe(false);
  });

  it("selecting multiple options forces matcher.isRegex=true", () => {
    const tree = ValidateSuggestions();
    expect(matcher.isRegex).toBe(false);
    const options = tree.find("[role='option']");
    options.at(0).simulate("click");
    options.at(1).simulate("click");
    expect(matcher.isRegex).toBe(true);
  });
});
