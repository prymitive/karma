import React from "react";

import { shallow, mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MultiSelect } from ".";

const Option = value => ({ label: value, value: value });

describe("<MultiSelect />", () => {
  it("renders without any extra props", () => {
    const tree = shallow(<MultiSelect />);
    expect(tree.text()).toBe("<StateManager />");
  });
});

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
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true", () => {
    const tree = shallow(<CustomMultiSelect isMulti />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when focused", () => {
    // this test is to cover styles state.isFocused conditions
    const tree = mount(<CustomMultiSelect autoFocus />);
    tree.find("input").simulate("focus");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with a value", () => {
    const tree = shallow(
      <CustomMultiSelect
        defaultValue={Option("foo")}
        options={[Option("foo", Option("bar"))]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true and a value", () => {
    const tree = shallow(
      <CustomMultiSelect
        isMulti
        defaultValue={Option("foo")}
        options={[Option("foo", Option("bar"))]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
