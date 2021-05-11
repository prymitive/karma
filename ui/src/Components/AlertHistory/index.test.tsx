import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { useInView } from "react-intersection-observer";

import toDiffableHtml from "diffable-html";

import { MockAlertGroup, MockAlert } from "__fixtures__/Alerts";
import {
  EmptyHistoryResponse,
  RainbowHistoryResponse,
  FailedHistoryResponse,
} from "__fixtures__/AlertHistory";
import { APIAlertGroupT, HistoryResponseT } from "Models/APITypes";
import { AlertHistory } from ".";

let group: APIAlertGroupT;

const MockGroup = (groupName: string) => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert", groupName: groupName },
    [],
    [],
    {},
    {}
  );
  return group;
};

const MockAlerts = (alertCount: number) => {
  for (let i = 1; i <= alertCount; i++) {
    const alert = MockAlert([], { instance: `instance${i}` }, "active");
    const startsAt = new Date();
    alert.startsAt = startsAt.toISOString();
    alert.alertmanager[0].startsAt = startsAt.toISOString();
    group.alerts.push(alert);
  }
};

beforeEach(() => {
  group = MockGroup("fakeGroup");
});

describe("<AlertHistory />", () => {
  it("matches snapshot with empty response", async () => {
    fetchMock.resetHistory();
    fetchMock.mock(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EmptyHistoryResponse),
      },
      {
        overwriteRoutes: true,
      }
    );

    MockAlerts(3);
    const tree = mount(<AlertHistory group={group}></AlertHistory>);
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with rainbow response", async () => {
    fetchMock.resetHistory();
    fetchMock.mock(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      }
    );

    MockAlerts(3);
    const tree = mount(<AlertHistory group={group}></AlertHistory>);
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't fetch when not in view", async () => {
    fetchMock.resetHistory();
    fetchMock.mock(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      }
    );

    (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
      jest.fn(),
      false,
    ] as any);

    MockAlerts(3);
    const tree = mount(<AlertHistory group={group}></AlertHistory>);
    await act(async () => {
      await fetchMock.flush(true);
    });
    tree.unmount();

    expect(fetchMock.calls()).toHaveLength(0);
  });

  it("handles reponses with errors", async () => {
    fetchMock.resetHistory();
    fetchMock.mock(
      "*",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(FailedHistoryResponse),
      },
      {
        overwriteRoutes: true,
      }
    );

    MockAlerts(3);
    const tree = mount(<AlertHistory group={group}></AlertHistory>);
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("handles fetch errors", async () => {
    fetchMock.resetHistory();
    fetchMock.mock(
      "*",
      {
        status: 500,
        body: "Error",
      },
      {
        overwriteRoutes: true,
      }
    );

    MockAlerts(3);
    const tree = mount(<AlertHistory group={group}></AlertHistory>);
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(fetchMock.calls()).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
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
      const alert = MockAlert([], { instance: `instance${i}` }, "active");
      const startsAt = new Date();
      alert.startsAt = startsAt.toISOString();
      alert.alertmanager[0].startsAt = startsAt.toISOString();
      g.alerts.push(alert);
    }

    it(`${testCase.title}`, async () => {
      fetchMock.resetHistory();
      fetchMock.mock(
        "*",
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase.response),
        },
        {
          overwriteRoutes: true,
        }
      );

      const tree = mount(<AlertHistory group={g}></AlertHistory>);
      await act(async () => {
        await fetchMock.flush(true);
      });
      tree.update();

      const rects = tree.find("rect").map((r) => r.props().className);
      expect(rects).toStrictEqual(testCase.values);
      tree.unmount();
    });
  }
});
