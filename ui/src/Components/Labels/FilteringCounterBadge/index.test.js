import React from "react";
import renderer from "react-test-renderer";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilteringCounterBadge } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const validateClassName = (value, className) => {
  const tree = renderer
    .create(
      <FilteringCounterBadge
        alertStore={alertStore}
        name="@state"
        value={value}
        counter={1}
      />
    )
    .toJSON();
  expect(tree.props.className.split(" ")).toContain(className);
};

const validateStyle = value => {
  const tree = renderer
    .create(
      <FilteringCounterBadge
        alertStore={alertStore}
        name="@state"
        value={value}
        counter={1}
      />
    )
    .toJSON();
  expect(tree.props.style).toMatchObject({});
};

const validateOnClick = value => {
  const tree = renderer
    .create(
      <FilteringCounterBadge
        alertStore={alertStore}
        name="@state"
        value={value}
        counter={1}
      />
    )
    .toJSON();

  tree.props.onClick({ preventDefault: () => {} });

  expect(alertStore.filters.values).toHaveLength(1);
  expect(alertStore.filters.values).toContainEqual(
    NewUnappliedFilter(`@state=${value}`)
  );
};

describe("<FilteringCounterBadge />", () => {
  it("@state=unprocessed counter badge should have className 'badge-secondary'", () => {
    validateClassName("unprocessed", "badge-secondary");
  });
  it("@state=active counter badge should have className 'badge-secondary'", () => {
    validateClassName("active", "badge-danger");
  });
  it("@state=suppressed counter badge should have className 'badge-secondary'", () => {
    validateClassName("suppressed", "badge-success");
  });

  it("@state=unprocessed counter badge should have empty style", () => {
    validateStyle("unprocessed");
  });
  it("@state=active counter badge should have empty style", () => {
    validateStyle("active");
  });
  it("@state=suppressed counter badge should have empty style", () => {
    validateStyle("suppressed");
  });

  it("counter badge should have correct children based on the counter prop value", () => {
    const tree = renderer
      .create(
        <FilteringCounterBadge
          alertStore={alertStore}
          name="@state"
          value="active"
          counter={123}
        />
      )
      .toJSON();
    expect(tree.children).toEqual(["123"]);
  });

  it("onClick method on @state=unprocessed counter badge should add a new filter", () => {
    validateOnClick("unprocessed");
  });
  it("onClick method on @state=active counter badge should add a new filter", () => {
    validateOnClick("active");
  });
  it("onClick method on @state=suppressed counter badge should add a new filter", () => {
    validateOnClick("suppressed");
  });
});
