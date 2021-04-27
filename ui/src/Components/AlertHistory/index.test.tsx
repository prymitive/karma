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
import { APIAlertGroupT } from "Models/APITypes";
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
});
