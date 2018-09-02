import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";

import { HistoryLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

describe("<HistoryLabel />", () => {
  it("renders name, matcher and value if all are set", () => {
    const tree = shallow(
      <HistoryLabel
        alertStore={alertStore}
        name="foo"
        matcher="="
        value="bar"
      />
    );
    expect(tree.text()).toBe("foo=bar");
  });

  it("renders only value if name is falsey", () => {
    const tree = shallow(
      <HistoryLabel alertStore={alertStore} name="" matcher="" value="bar" />
    );
    expect(tree.text()).toBe("bar");
  });
});
