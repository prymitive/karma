import { render, fireEvent } from "@testing-library/react";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
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

const renderOverviewModalContent = () =>
  render(
    <span>
      <OverviewModalContent alertStore={alertStore} onHide={onHide} />
    </span>,
  );

describe("<OverviewModalContent />", () => {
  it("matches snapshot with labels to show", () => {
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 1,
        counters: [
          {
            name: "foo",
            hits: 16,
            values: [
              {
                value: "bar1",
                raw: "foo=bar1",
                hits: 8,
                percent: 50,
                offset: 0,
              },
              {
                value: "bar2",
                raw: "foo=bar2",
                hits: 4,
                percent: 25,
                offset: 50,
              },
              {
                value: "bar3",
                raw: "foo=bar3",
                hits: 4,
                percent: 25,
                offset: 75,
              },
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
        ],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    alertStore.filters.setFilterValues([
      NewUnappliedFilter("abc=xyz"),
      NewUnappliedFilter("foo=bar"),
    ]);

    const { asFragment } = renderOverviewModalContent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot with no labels to show", () => {
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 20,
        counters: [],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { asFragment } = renderOverviewModalContent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders all labels after expand button click", () => {
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 5,
        counters: [
          {
            name: "foo",
            hits: 5,
            values: [
              {
                value: "bar",
                raw: "foo=bar",
                hits: 5,
                percent: 100,
                offset: 0,
              },
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
        ],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { container } = renderOverviewModalContent();

    const labels = container.querySelectorAll("span.components-label");
    expect(labels).toHaveLength(2 + 1); // +1 for toggle icon
    expect(labels[0].textContent).toBe("5foo");
    expect(labels[1].textContent).toBe("5bar");

    const toggleBtn = container.querySelector(
      "span.badge.cursor-pointer.with-click",
    );
    fireEvent.click(toggleBtn!);

    const expandedLabels = container.querySelectorAll("span.components-label");
    expect(expandedLabels).toHaveLength(4 + 1); // +1 for toggle icon
    expect(expandedLabels[3].textContent).toBe("3bar");
    expect(expandedLabels[4].textContent).toBe("3foo");
  });
});
