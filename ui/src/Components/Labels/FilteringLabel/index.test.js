import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilteringLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const RenderAndClick = (name, value) => {
  const tree = mount(
    <FilteringLabel alertStore={alertStore} name={name} value={value} />
  );
  tree.find(".components-label").simulate("click");
};

describe("<FilteringLabel />", () => {
  it("matches snapshot", () => {
    const tree = mount(
      <FilteringLabel alertStore={alertStore} name="foo" value="bar" />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
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
