import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import Select from "react-select";

import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";

const Option = (value) => ({ label: value, value: value });

const ThemedSelect = (props) => (
  <Select styles={ReactSelectStyles(ReactSelectColors.Light)} {...props} />
);

describe("<WrappedCustomMultiSelect />", () => {
  it("matches snapshot with isMulti=true", () => {
    const tree = mount(<ThemedSelect isMulti />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when focused", () => {
    // this test is to cover styles state.isFocused conditions
    const tree = mount(<ThemedSelect autoFocus />);
    tree.find("input").simulate("focus");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with a value", () => {
    const tree = mount(
      <ThemedSelect
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true and a value", () => {
    const tree = mount(
      <ThemedSelect
        isMulti
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isDisabled=true", () => {
    const tree = mount(
      <ThemedSelect
        isDisabled
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
