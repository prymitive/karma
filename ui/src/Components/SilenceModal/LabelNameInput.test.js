import React from "react";

import { shallow, mount } from "enzyme";

import { NewEmptyMatcher, MatcherValueToObject } from "Stores/SilenceFormStore";
import { LabelNameInput } from "./LabelNameInput";

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

const ShallowLabelNameInput = isValid => {
  return shallow(<LabelNameInput matcher={matcher} isValid={isValid} />);
};

const MountedLabelNameInput = isValid => {
  return mount(<LabelNameInput matcher={matcher} isValid={isValid} />);
};

const ValidateSuggestions = () => {
  const tree = MountedLabelNameInput(true);
  // click on the react-select component doesn't seem to trigger options
  // rendering in tests, so change the input instead
  tree.find("input").simulate("change", { target: { value: "f" } });
  return tree;
};

describe("<LabelNameInput />", () => {
  it("matches snapshot", () => {
    const tree = ShallowLabelNameInput(true);
    expect(tree).toMatchSnapshot();
  });

  it("doesn't renders ValidationError after passed validation", () => {
    // clear the name so placeholder is rendered
    matcher.name = "";
    const tree = ShallowLabelNameInput(true);
    expect(tree.html()).toMatch(/Label name/);
    expect(tree.html()).not.toMatch(/fa-exclamation-circle/);
    expect(tree.html()).not.toMatch(/Required/);
  });

  it("renders ValidationError after failed validation", () => {
    // clear the name so placeholder is rendered
    matcher.name = "";
    const tree = ShallowLabelNameInput(false);
    expect(tree.html()).not.toMatch(/Label name/);
    expect(tree.html()).toMatch(/fa-exclamation-circle/);
    expect(tree.html()).toMatch(/Required/);
  });

  it("renders suggestions", () => {
    const tree = ValidateSuggestions();
    const options = tree.find("[role='option']");
    expect(options).toHaveLength(2);
    expect(options.at(0).text()).toBe("job");
    expect(options.at(1).text()).toBe("cluster");
  });

  it("clicking on options updates the matcher", () => {
    const tree = ValidateSuggestions();
    const option = tree.find("[role='option']").at(0);
    option.simulate("click");
    expect(matcher.name).toBe("job");
  });

  it("populates suggestions on mount", done => {
    fetch
      .once(JSON.stringify(["name1", "name2", "name3"]))
      .once(JSON.stringify(["value1", "value2", "value3"]));
    ShallowLabelNameInput(true);
    // use timeout since mount will call fetch
    setTimeout(() => {
      expect(matcher.suggestions.names).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(matcher.suggestions.names[i]).toMatchObject(
          MatcherValueToObject(`name${i + 1}`)
        );
        expect(matcher.suggestions.values[i]).toMatchObject(
          MatcherValueToObject(`value${i + 1}`)
        );
      }
      done();
    }, 100);
  });

  it("suggestions are emptied on failed fetch", done => {
    fetch.mockReject(new Error("fake error message"));
    ShallowLabelNameInput(true);
    // use timeout since mount will call fetch
    setTimeout(() => {
      expect(matcher.suggestions.names).toHaveLength(0);
      done();
    }, 100);
  });

  it("doesn't fetch suggestions if value is changed to empty string", () => {
    const tree = MountedLabelNameInput(true);
    const instance = tree.instance();
    const fetchSpy = jest.spyOn(instance, "populateValueSuggestions");
    instance.onChange("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
