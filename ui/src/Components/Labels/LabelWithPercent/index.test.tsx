import { render, screen, fireEvent } from "@testing-library/react";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import LabelWithPercent from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const renderLabelWithPercent = (
  name: string,
  value: string,
  hits: number,
  percent: number,
  offset: number,
  isActive: boolean,
) => {
  return render(
    <LabelWithPercent
      alertStore={alertStore}
      name={name}
      value={value}
      hits={hits}
      percent={percent}
      offset={offset}
      isActive={isActive}
    />,
  );
};

const renderAndClick = (name: string, value: string, clickOptions?: any) => {
  renderLabelWithPercent(name, value, 25, 50, 0, false);
  const labelText = screen.getByText(value);
  fireEvent.click(labelText, clickOptions || {});
};

describe("<LabelWithPercent />", () => {
  it("matches snapshot with offset=0", () => {
    const { asFragment } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      50,
      0,
      false,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with offset=25", () => {
    const { asFragment } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      50,
      25,
      false,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with isActive=true", () => {
    const { asFragment } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      50,
      0,
      true,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("calling adds a new filter 'foo=bar'", () => {
    renderAndClick("foo", "bar");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo=bar"),
    );
  });

  it("clicking the X button removes label from filters", () => {
    const { container } = renderLabelWithPercent("foo", "bar", 25, 50, 0, true);
    const removeButton = container.querySelector("svg.fa-xmark");
    fireEvent.click(removeButton!);
    expect(alertStore.filters.values).toHaveLength(0);
    expect(alertStore.filters.values).not.toContainEqual(
      NewUnappliedFilter("foo=bar"),
    );
  });

  it("calling onClick() while holding Alt key adds a new filter 'foo!=bar'", () => {
    renderAndClick("foo", "bar", { altKey: true });
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo!=bar"),
    );
  });

  it("uses bg-danger when percent is >66", () => {
    const { container } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      67,
      0,
      false,
    );
    expect(
      container.querySelector(".progress-bar.bg-danger"),
    ).toBeInTheDocument();
  });

  it("uses bg-warning when percent is >33", () => {
    const { container } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      66,
      0,
      false,
    );
    expect(
      container.querySelector(".progress-bar.bg-warning"),
    ).toBeInTheDocument();
  });

  it("uses bg-success when percent is <=33", () => {
    const { container } = renderLabelWithPercent(
      "foo",
      "bar",
      25,
      33,
      0,
      false,
    );
    expect(
      container.querySelector(".progress-bar.bg-success"),
    ).toBeInTheDocument();
  });
});
