import { act } from "react";

import { render } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { useInView } from "react-intersection-observer";

import { MockAlertGroup, MockAlert } from "__fixtures__/Alerts";
import {
  EmptyHistoryResponse,
  RainbowHistoryResponse,
  FailedHistoryResponse,
} from "__fixtures__/AlertHistory";
import type {
  APIAlertGroupT,
  APIGridT,
  HistoryResponseT,
  LabelsT,
} from "Models/APITypes";
import { AlertHistory } from ".";

let group: APIAlertGroupT;
let grid: APIGridT;

const MockGroup = (groupName: string, sharedLabels: LabelsT = []) => {
  const group = MockAlertGroup(
    [
      { name: "alertname", value: "Fake Alert" },
      { name: "groupName", value: groupName },
    ],
    [],
    [],
    sharedLabels,
    {},
  );
  return group;
};

const MockAlerts = (alertCount: number) => {
  for (let i = 1; i <= alertCount; i++) {
    const alert = MockAlert(
      [],
      [{ name: "instance", value: `instance${i}` }],
      "active",
    );
    const startsAt = new Date();
    alert.startsAt = startsAt.toISOString();
    for (let j = 0; j < alert.alertmanager.length; j++) {
      alert.alertmanager[j].startsAt = startsAt.toISOString();
      alert.alertmanager[j].source = "http://prometheus.example.com/graph";
    }
    group.alerts.push(alert);
  }
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

  group = MockGroup("fakeGroup");
  grid = {
    labelName: "foo",
    labelValue: "bar",
    alertGroups: [],
    totalGroups: 0,
    stateCount: {
      active: 0,
      suppressed: 0,
      unprocessed: 0,
    },
  };
});

afterEach(() => {
  fetchMock.mockClear();
  fetchMock.mockReset();
  jest.useRealTimers();
});

describe("<AlertHistory />", () => {
  it("send a correct payload with empty grid", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    grid.labelName = "";
    grid.labelValue = "";
    MockAlerts(3);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.calls()[0]?.options?.body).toStrictEqual(
      JSON.stringify({
        sources: [
          "https://secure.example.com/graph",
          "http://plain.example.com/",
        ],
        labels: { alertname: "Fake Alert", groupName: "fakeGroup" },
      }),
    );
    unmount();
  });

  it("send a correct payload with non-empty grid", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.calls()[0]?.options?.body).toStrictEqual(
      JSON.stringify({
        sources: [
          "https://secure.example.com/graph",
          "http://plain.example.com/",
        ],
        labels: { alertname: "Fake Alert", groupName: "fakeGroup", foo: "bar" },
      }),
    );
    unmount();
  });

  it("send a correct payload with @cluster grid", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    grid.labelName = "@cluster";
    grid.labelValue = "prod";
    MockAlerts(3);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.calls()[0]?.options?.body).toStrictEqual(
      JSON.stringify({
        sources: [
          "https://secure.example.com/graph",
          "http://plain.example.com/",
        ],
        labels: { alertname: "Fake Alert", groupName: "fakeGroup" },
      }),
    );
    unmount();
  });

  it("send a correct payload with shared labels", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    group = MockGroup("fakeGroup", [
      { name: "shared1", value: "value1" },
      { name: "shared2", value: "value2" },
    ]);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(fetchMock.callHistory.calls()[0]?.options?.body).toStrictEqual(
      JSON.stringify({
        sources: [
          "https://secure.example.com/graph",
          "http://plain.example.com/",
        ],
        labels: {
          alertname: "Fake Alert",
          groupName: "fakeGroup",
          shared1: "value1",
          shared2: "value2",
          foo: "bar",
        },
      }),
    );
    unmount();
  });

  it("matches snapshot with empty response", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    const { unmount, asFragment } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(asFragment()).toMatchSnapshot();
    unmount();
  });

  it("matches snapshot with rainbow response", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    const { unmount, asFragment } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(asFragment()).toMatchSnapshot();
    unmount();
  });

  it("doesn't fetch when not in view", async () => {
    // Verifies that react-intersection-observer prevents fetch when component is outside viewport
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    MockAlerts(3);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    unmount();

    expect(fetchMock.callHistory.calls()).toHaveLength(0);
  });

  it("fetches when component transitions from out-of-view to in-view", async () => {
    // Verifies that react-intersection-observer triggers fetch when component becomes visible
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    MockAlerts(3);
    const { rerender, unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(0);

    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      true,
    ] as any);

    rerender(<AlertHistory group={group} grid={grid}></AlertHistory>);
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);

    unmount();
  });

  it("fetches an update after 300 seconds", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    const inView = true;
    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      inView,
    ] as any);

    MockAlerts(3);
    const { unmount } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(1000 * 299);
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(1000 * 2);
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(2);

    unmount();
  });

  it("handles responses with errors", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(FailedHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    const { unmount, asFragment } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(asFragment()).toMatchSnapshot();
    unmount();
  });

  it("handles fetch errors", async () => {
    fetchMock.mockClear();
    fetchMock.route(
      "*",
      {
        status: 500,
        body: "Error",
      },
      {
        overwriteRoutes: true,
      },
    );

    MockAlerts(3);
    const { unmount, asFragment } = render(
      <AlertHistory group={group} grid={grid}></AlertHistory>,
    );
    await act(async () => {
      await fetchMock.callHistory.flush(true);
    });
    expect(fetchMock.callHistory.calls()).toHaveLength(1);
    expect(asFragment()).toMatchSnapshot();
    unmount();
  });

  interface testCasesT {
    title: string;
    response: HistoryResponseT;
    values: string[];
  }
  const testCases: testCasesT[] = [
    {
      title: "EmptyHistoryResponse",
      response: EmptyHistoryResponse,
      values: new Array(24).fill("inactive"),
    },
    {
      title: "RainbowHistoryResponse",
      response: RainbowHistoryResponse,
      values: [
        "inactive",
        "firing firing-1",
        "firing firing-2",
        "firing firing-3",
        "firing firing-4",
        "firing firing-5",
        "inactive",
        "firing firing-1",
        "firing firing-2",
        "firing firing-3",
        "firing firing-4",
        "firing firing-5",
        "inactive",
        "firing firing-1",
        "firing firing-2",
        "firing firing-3",
        "firing firing-4",
        "firing firing-5",
        "inactive",
        "firing firing-1",
        "firing firing-2",
        "firing firing-3",
        "firing firing-4",
        "firing firing-5",
      ],
    },
    {
      title: "FailedHistoryResponse",
      response: FailedHistoryResponse,
      values: ["error"],
    },
    {
      title: "Single alert",
      response: {
        error: "",
        samples: [
          ...Array(12).fill({ timestamp: "", value: 0 }),
          { timestamp: "", value: 1 },
          ...Array(11).fill({ timestamp: "", value: 0 }),
        ],
      },
      values: [
        ...new Array(12).fill("inactive"),
        "firing firing-1",
        ...new Array(11).fill("inactive"),
      ],
    },
    {
      title: "2 alerts in a single hour",
      response: {
        error: "",
        samples: [
          { timestamp: "", value: 2 },
          ...Array(23).fill({ timestamp: "", value: 0 }),
        ],
      },
      values: ["firing firing-2", ...new Array(23).fill("inactive")],
    },
    {
      title: "5 alerts in a single hour",
      response: {
        error: "",
        samples: [
          { timestamp: "", value: 5 },
          ...Array(23).fill({ timestamp: "", value: 0 }),
        ],
      },
      values: ["firing firing-5", ...new Array(23).fill("inactive")],
    },
    {
      title: "20 alerts in a single hour",
      response: {
        error: "",
        samples: [
          { timestamp: "", value: 20 },
          ...Array(23).fill({ timestamp: "", value: 0 }),
        ],
      },
      values: ["firing firing-5", ...new Array(23).fill("inactive")],
    },
  ];
  for (const testCase of testCases) {
    const g = MockGroup("fakeGroup");
    for (let i = 1; i <= 5; i++) {
      const alert = MockAlert(
        [],
        [{ name: "instance", value: `instance${i}` }],
        "active",
      );
      const startsAt = new Date();
      alert.startsAt = startsAt.toISOString();
      alert.alertmanager.push(alert.alertmanager[0]);
      for (let j = 0; j < alert.alertmanager.length; j++) {
        alert.alertmanager[j].startsAt = startsAt.toISOString();
        alert.alertmanager[j].source = "http://prometheus.example.com/graph";
      }
      g.alerts.push(alert);
    }
    const gr = {
      labelName: "foo",
      labelValue: "bar",
      alertGroups: [],
      totalGroups: 0,
      stateCount: {
        active: 0,
        suppressed: 0,
        unprocessed: 0,
      },
    };

    it(`${testCase.title}`, async () => {
      fetchMock.mockClear();
      fetchMock.route(
        "*",
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase.response),
        },
        {
          overwriteRoutes: true,
        },
      );

      const { container, unmount } = render(
        <AlertHistory group={g} grid={gr}></AlertHistory>,
      );
      await act(async () => {
        await fetchMock.callHistory.flush(true);
      });

      const rects = Array.from(container.querySelectorAll("rect")).map(
        (r) => r.className.baseVal,
      );
      expect(rects).toStrictEqual(testCase.values);
      unmount();
    });
  }
});
