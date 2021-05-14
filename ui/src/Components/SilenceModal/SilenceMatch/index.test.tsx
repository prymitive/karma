import { mount } from "enzyme";

import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherWithIDT,
} from "Stores/SilenceFormStore";
import { StringToOption } from "Common/Select";
import SilenceMatch from ".";

let silenceFormStore: SilenceFormStore;
let matcher: MatcherWithIDT;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
});

const MockOnDelete = jest.fn();

const MountedLabelValueInput = (enableIsEqual: boolean) => {
  return mount(
    <SilenceMatch
      matcher={matcher}
      silenceFormStore={silenceFormStore}
      showDelete={false}
      onDelete={MockOnDelete}
      isValid={true}
      enableIsEqual={enableIsEqual}
    />
  );
};

describe("<SilenceMatch />", () => {
  it("allows changing matcher.isRegex value when matcher.values contains 1 element", () => {
    matcher.values = [StringToOption("foo")];
    const tree = MountedLabelValueInput(true);
    expect(matcher.isRegex).toBe(false);
    const regex = tree.find("input[type='checkbox']").at(1);
    regex.simulate("change", { target: { checked: true } });
    expect(matcher.isRegex).toBe(true);
  });

  it("disallows changing matcher.isRegex value when matcher.values contains 2 elements", () => {
    matcher.isRegex = true;
    matcher.values = [StringToOption("foo"), StringToOption("bar")];
    const tree = MountedLabelValueInput(true);
    expect(matcher.isRegex).toBe(true);
    const regex = tree.find("input[type='checkbox']").at(1);
    regex.simulate("change", { target: { checked: false } });
    expect(matcher.isRegex).toBe(true);
  });

  it("updates isEqual on click", () => {
    matcher.values = [StringToOption("foo")];
    const tree = MountedLabelValueInput(true);
    expect(matcher.isEqual).toBe(true);
    const checkbox = tree.find("input[type='checkbox']").at(0);
    expect(checkbox.props().disabled).toBe(false);
    checkbox.simulate("change", { target: { checked: false } });
    expect(matcher.isEqual).toBe(false);
  });

  it("isEqual is read-only when enableIsEqual=false", () => {
    matcher.values = [StringToOption("foo")];
    matcher.isEqual = false;
    const tree = MountedLabelValueInput(false);
    expect(matcher.isEqual).toBe(true);
    const checkbox = tree.find("input[type='checkbox']").at(0);
    expect(checkbox.props().disabled).toBe(true);
  });
});
