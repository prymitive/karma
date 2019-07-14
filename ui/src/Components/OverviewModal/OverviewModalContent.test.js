import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
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
    alertStore.filters.values = [
      NewUnappliedFilter("abc=xyz"),
      NewUnappliedFilter("foo=bar")
    ];
    alertStore.data.counters = [
      {
        name: "foo",
        hits: 16,
        values: [
          { value: "bar1", raw: "foo=bar1", hits: 8, percent: 50, offset: 0 },
          { value: "bar2", raw: "foo=bar2", hits: 4, percent: 25, offset: 50 },
          { value: "bar3", raw: "foo=bar3", hits: 4, percent: 25, offset: 75 }
        ]
      },
      {
        name: "alertname",
        hits: 5,
        values: [
          {
            value: "Host_Down",
            raw: "alertname=Host_Down",
            hits: 5,
            percent: 100,
            offset: 0
          }
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
