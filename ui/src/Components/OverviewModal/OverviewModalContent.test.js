import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { OverviewModalContent } from "./OverviewModalContent";

let alertStore;
const onHide = jest.fn();

beforeEach(() => {
  alertStore = new AlertStore([]);
  onHide.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("<OverviewModalContent />", () => {
  it("matches snapshot with labels to show", () => {
    alertStore.data.counters = [
      {
        name: "foo",
        hits: 16,
        values: [
          { value: "bar1", hits: 8, percent: 50 },
          { value: "bar2", hits: 4, percent: 25 },
          { value: "bar3", hits: 4, percent: 25 }
        ]
      }
    ];

    // we have multiple fragments and enzyme only renders the first one
    // in html() and text(), debug() would work but it's noisy
    // https://github.com/airbnb/enzyme/issues/1213
    const tree = mount(
      <span>
        <Provider alertStore={alertStore}>
          <OverviewModalContent alertStore={alertStore} onHide={onHide} />
        </Provider>
      </span>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with no labels to show", () => {
    alertStore.data.counters = [];

    // we have multiple fragments and enzyme only renders the first one
    // in html() and text(), debug() would work but it's noisy
    // https://github.com/airbnb/enzyme/issues/1213
    const tree = mount(
      <span>
        <Provider alertStore={alertStore}>
          <OverviewModalContent alertStore={alertStore} onHide={onHide} />
        </Provider>
      </span>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
