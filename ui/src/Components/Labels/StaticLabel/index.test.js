import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";

import { StaticLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

describe("<FilteringLabel />", () => {
  it("matches snapshot", () => {
    const tree = mount(
      <StaticLabel alertStore={alertStore} name="foo" value="bar" />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
