import { render, fireEvent } from "@testing-library/react";

import Select from "react-select";

import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";

const Option = (value: string) => ({ label: value, value: value });

const ThemedSelect = (props: any) => (
  <Select styles={ReactSelectStyles(ReactSelectColors.Light)} {...props} />
);

describe("<WrappedCustomMultiSelect />", () => {
  it("matches snapshot with isMulti=true", () => {
    const { asFragment } = render(<ThemedSelect isMulti />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot when focused", () => {
    const { asFragment, container } = render(<ThemedSelect autoFocus />);
    const input = container.querySelector("input");
    fireEvent.focus(input!);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot when focused and disabled", () => {
    const { asFragment, container } = render(
      <ThemedSelect autoFocus isDisabled />,
    );
    const input = container.querySelector("input");
    fireEvent.focus(input!);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with a value", () => {
    const { asFragment } = render(
      <ThemedSelect
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with isMulti=true and a value", () => {
    const { asFragment } = render(
      <ThemedSelect
        isMulti
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with isDisabled=true", () => {
    const { asFragment } = render(
      <ThemedSelect
        isDisabled
        defaultValue={Option("foo")}
        options={[Option("foo"), Option("bar")]}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
