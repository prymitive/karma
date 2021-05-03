import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { OverviewModalContent } from "./OverviewModalContent";

let alertStore: AlertStore;
const onHide = jest.fn();

beforeEach(() => {
  alertStore = new AlertStore([]);
  onHide.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedOverviewModalContent = () =>
  // we have multiple fragments and enzyme only renders the first one
  // in html() and text(), debug() would work but it's noisy
  // https://github.com/airbnb/enzyme/issues/1213
  mount(
    <span>
      <OverviewModalContent alertStore={alertStore} onHide={onHide} />
    </span>
  );

describe("<OverviewModalContent />", () => {
  it("matches snapshot with labels to show", () => {
    alertStore.filters.setFilterValues([
      NewUnappliedFilter("abc=xyz"),
      NewUnappliedFilter("foo=bar"),
    ]);
    alertStore.data.setCounters([
      {
        name: "foo",
        hits: 16,
        values: [
          { value: "bar1", raw: "foo=bar1", hits: 8, percent: 50, offset: 0 },
          { value: "bar2", raw: "foo=bar2", hits: 4, percent: 25, offset: 50 },
          { value: "bar3", raw: "foo=bar3", hits: 4, percent: 25, offset: 75 },
        ],
      },
      {
        name: "bar",
        hits: 20,
        values: Array.from(Array(20).keys()).map((i) => ({
          value: `baz${i + 1}`,
          raw: `bar=baz${i + 1}`,
          hits: 1,
          percent: 5,
          offset: i * 5,
        })),
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
            offset: 0,
          },
        ],
      },
    ]);

    const tree = MountedOverviewModalContent();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with no labels to show", () => {
    alertStore.data.setCounters([]);
    const tree = MountedOverviewModalContent();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders all labels after expand button click", () => {
    alertStore.info.setTotalAlerts(5);
    alertStore.data.setCounters([
      {
        name: "foo",
        hits: 5,
        values: [
          { value: "bar", raw: "foo=bar", hits: 5, percent: 100, offset: 0 },
        ],
      },
      {
        name: "bar",
        hits: 3,
        values: [
          {
            value: "foo",
            raw: "bar=foo",
            hits: 3,
            percent: 100,
            offset: 0,
          },
        ],
      },
    ]);
    const tree = MountedOverviewModalContent();

    expect(tree.find("span.components-label")).toHaveLength(2 + 1); // +1 for toggle icon
    expect(tree.find("span.components-label").at(0).text()).toBe("5foo");
    expect(tree.find("span.components-label").at(1).text()).toBe("5foo: bar");

    tree.find("span.badge.cursor-pointer.with-click").simulate("click");

    expect(tree.find("span.components-label")).toHaveLength(4 + 1); // +1 for toggle icon
    expect(tree.find("span.components-label").at(3).text()).toBe("3bar");
    expect(tree.find("span.components-label").at(4).text()).toBe("3bar: foo");
  });
});
