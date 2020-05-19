import React from "react";

import { mount, render } from "enzyme";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { QueryOperators } from "Common/Query";
import { FilteringCounterBadge } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const validateClassName = (value, className, themed) => {
  const tree = mount(
    <FilteringCounterBadge
      alertStore={alertStore}
      name="@state"
      value={value}
      counter={1}
      themed={themed}
    />
  );
  expect(tree.find("span").hasClass(className)).toBe(true);
};

const validateStyle = (value, themed) => {
  const tree = mount(
    <FilteringCounterBadge
      alertStore={alertStore}
      name="@state"
      value={value}
      counter={1}
      themed={themed}
    />
  );
  expect(tree.find("span").prop("style")).toEqual({});
};

const validateOnClick = (value, themed, isNegative) => {
  const tree = mount(
    <FilteringCounterBadge
      alertStore={alertStore}
      name="@state"
      value={value}
      counter={1}
      themed={themed}
    />
  );
  tree
    .find("span.components-label")
    .simulate("click", { altKey: isNegative ? true : false });
  expect(alertStore.filters.values).toHaveLength(1);
  expect(alertStore.filters.values).toContainEqual(
    NewUnappliedFilter(
      `@state${
        isNegative ? QueryOperators.NotEqual : QueryOperators.Equal
      }${value}`
    )
  );
};

describe("<FilteringCounterBadge />", () => {
  it("themed @state=unprocessed counter badge should have className 'badge-secondary'", () => {
    validateClassName("unprocessed", "badge-secondary", true);
  });
  it("themed @state=active counter badge should have className 'badge-secondary'", () => {
    validateClassName("active", "badge-danger", true);
  });
  it("themed @state=suppressed counter badge should have className 'badge-secondary'", () => {
    validateClassName("suppressed", "badge-success", true);
  });
  it("unthemed @state=suppressed counter badge should have className 'badge-light'", () => {
    validateClassName("suppressed", "badge-light", false);
  });

  it("@state=unprocessed counter badge should have empty style", () => {
    validateStyle("unprocessed", true);
  });
  it("@state=active counter badge should have empty style", () => {
    validateStyle("active", true);
  });
  it("@state=suppressed counter badge should have empty style", () => {
    validateStyle("suppressed", true);
  });

  it("counter badge should have correct children based on the counter prop value", () => {
    const tree = render(
      <FilteringCounterBadge
        alertStore={alertStore}
        name="@state"
        value="active"
        counter={123}
        themed={true}
      />
    );
    expect(tree.text()).toBe("123");
  });

  for (let state of ["unprocessed", "active", "suppressed"]) {
    it(`click on @state=${state} counter badge should add a new filter`, () => {
      validateOnClick(state, true, false);
    });
    it(`alt+click method on @state=${state} counter badge should add a new negative filter`, () => {
      validateOnClick(state, true, true);
    });
  }
});
