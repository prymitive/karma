import React from "react";
import renderer from "react-test-renderer";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilterInputLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

describe("<FilterInputLabel />", () => {
  it("renders without crashing", () => {
    renderer.create(
      <FilterInputLabel
        alertStore={alertStore}
        filter={NewUnappliedFilter("foo=bar")}
      />
    );
  });
});
