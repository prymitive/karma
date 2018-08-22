import React from "react";
import renderer from "react-test-renderer";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilteringLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const RenderAndClick = (name, value) => {
  const tree = renderer
    .create(
      <FilteringLabel alertStore={alertStore} name={name} value={value} />
    )
    .toJSON();

  tree.props.onClick({ preventDefault: () => {} });
};

describe("<FilteringLabel />", () => {
  it("renders without crashing", () => {
    renderer.create(
      <FilteringLabel alertStore={alertStore} name="foo" value="bar" />
    );
  });

  it("calling onClick() adds a new filter 'foo=bar'", () => {
    RenderAndClick("foo", "bar");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("calling onClick() multiple times appends extra filter 'baz=bar'", () => {
    RenderAndClick("foo", "bar");
    RenderAndClick("bar", "baz");
    expect(alertStore.filters.values).toHaveLength(2);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo=bar")
    );
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("bar=baz")
    );
  });
});
