import React from "react";

import { shallow } from "enzyme";

import { MultiSelect } from ".";

const Option = value => ({ label: value, value: value });

class CustomMultiSelect extends MultiSelect {
  constructor(props) {
    super(props);
    this.extraProps = props;
  }

  renderProps = () => this.extraProps;
}

describe("<CustomMultiSelect />", () => {
  it("matches snapshot with defaults", () => {
    const tree = shallow(<CustomMultiSelect />);
    expect(tree).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true", () => {
    const tree = shallow(<CustomMultiSelect isMulti />);
    expect(tree).toMatchSnapshot();
  });

  it("matches snapshot with a value", () => {
    const tree = shallow(
      <CustomMultiSelect
        defaultValue={Option("foo")}
        options={[Option("foo", Option("bar"))]}
      />
    );
    expect(tree).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true and a value", () => {
    const tree = shallow(
      <CustomMultiSelect
        isMulti
        defaultValue={Option("foo")}
        options={[Option("foo", Option("bar"))]}
      />
    );
    expect(tree).toMatchSnapshot();
  });
});
