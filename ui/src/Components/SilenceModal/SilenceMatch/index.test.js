import React from "react";

import { shallow } from "enzyme";

import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject,
} from "Stores/SilenceFormStore";
import { SilenceMatch } from ".";

let silenceFormStore;
let matcher;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
});

const MockOnDelete = jest.fn();

const ShallowLabelValueInput = () => {
  return shallow(
    <SilenceMatch
      matcher={matcher}
      silenceFormStore={silenceFormStore}
      showDelete={false}
      onDelete={MockOnDelete}
      isValid={true}
    />
  );
};

describe("<SilenceMatch />", () => {
  it("allows changing matcher.isRegex value when matcher.values contains 1 element", () => {
    matcher.values = [MatcherValueToObject("foo")];
    const tree = ShallowLabelValueInput();
    expect(matcher.isRegex).toBe(false);
    const regex = tree.find("input[type='checkbox']");
    regex.simulate("change", { target: { checked: true } });
    expect(matcher.isRegex).toBe(true);
  });

  it("disallows changing matcher.isRegex value when matcher.values contains 2 elements", () => {
    matcher.isRegex = true;
    matcher.values = [MatcherValueToObject("foo"), MatcherValueToObject("bar")];
    const tree = ShallowLabelValueInput();
    expect(matcher.isRegex).toBe(true);
    const regex = tree.find("input[type='checkbox']");
    regex.simulate("change", { target: { checked: false } });
    expect(matcher.isRegex).toBe(true);
  });
});
