import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { MultiSelect } from ".";

const Option = (value) => ({ label: value, value: value });

const Wrapped = (component) => (
  <ThemeContext.Provider
    value={{
      reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
    }}
  >
    {component}
  </ThemeContext.Provider>
);

describe("<MultiSelect />", () => {
  it("matches snapshot without any extra props", () => {
    const tree = mount(Wrapped(<MultiSelect />));
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

class CustomMultiSelect extends MultiSelect {
  constructor(props) {
    super(props);
    this.extraProps = props;
  }

  renderProps = () => this.extraProps;
}

const WrappedCustomMultiSelect = (props) =>
  Wrapped(<CustomMultiSelect {...props} />);

describe("<WrappedCustomMultiSelect />", () => {
  it("matches snapshot with defaults", () => {
    const tree = mount(<WrappedCustomMultiSelect />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true", () => {
    const tree = mount(<WrappedCustomMultiSelect isMulti />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when focused", () => {
    // this test is to cover styles state.isFocused conditions
    const tree = mount(<WrappedCustomMultiSelect autoFocus />);
    tree.find("input").simulate("focus");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with a value", () => {
    const tree = mount(
      <WrappedCustomMultiSelect
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true and a value", () => {
    const tree = mount(
      <WrappedCustomMultiSelect
        isMulti
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isDisabled=true", () => {
    const tree = mount(
      <WrappedCustomMultiSelect
        isDisabled
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
