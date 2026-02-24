import { act } from "react";

import { render, fireEvent } from "@testing-library/react";

import copy from "copy-to-clipboard";

import { MockAlertGroup } from "__fixtures__/Alerts";
import type {
  APIAlertGroupT,
  APIAlertsResponseUpstreamsT,
} from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GroupMenu, MenuContent } from "./GroupMenu";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

let MockAfterClick: () => void;
let MockSetIsMenuOpen: () => void;

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 3, healthy: 3, failed: 0 },
  clusters: { default: ["am1"], ro: ["ro"], am2: ["am2"] },
  instances: [
    {
      name: "am1",
      uri: "http://localhost:8080",
      publicURI: "http://example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "default",
      clusterMembers: ["am1"],
    },
    {
      name: "ro",
      uri: "http://localhost:8080",
      publicURI: "http://example.com",
      readonly: true,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "ro",
      clusterMembers: ["ro"],
    },
    {
      name: "am2",
      uri: "http://localhost:8080",
      publicURI: "http://example.com",
      readonly: false,
      headers: {},
      corsCredentials: "include",
      error: "",
      version: "0.24.0",
      cluster: "am2",
      clusterMembers: ["am2"],
    },
  ],
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  jest.useFakeTimers();
  jest.clearAllMocks();
  MockAfterClick = jest.fn();
  MockSetIsMenuOpen = jest.fn();

  alertStore.data.setUpstreams(generateUpstreams());
});

const renderGroupMenu = (group: APIAlertGroupT, themed: boolean) => {
  return render(
    <GroupMenu
      group={group}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      themed={themed}
      setIsMenuOpen={MockSetIsMenuOpen}
    />,
  );
};

describe("<GroupMenu />", () => {
  it("menu content is hidden by default", () => {
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderGroupMenu(group, true);
    expect(container.querySelector("div.dropdown-menu")).toBeNull();
    expect(MockSetIsMenuOpen).not.toHaveBeenCalled();
  });

  it("clicking toggle renders menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderGroupMenu(group, true);
    const toggle = container.querySelector("span.cursor-pointer");
    fireEvent.click(toggle!);
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();
    await act(() => promise);
  });

  it("clicking toggle twice hides menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderGroupMenu(group, true);
    const toggle = container.querySelector("span.cursor-pointer");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(container.querySelector("div.dropdown-menu")).toBeNull();
    await act(() => promise);
  });

  it("clicking menu item hides menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderGroupMenu(group, true);
    const toggle = container.querySelector("span.cursor-pointer");

    fireEvent.click(toggle!);
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(container.querySelector("div.dropdown-menu")).toBeInTheDocument();

    const menuItem = container.querySelector("div.dropdown-item");
    fireEvent.click(menuItem!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(container.querySelector("div.dropdown-menu")).toBeNull();
    await act(() => promise);
  });
});

const renderMenuContent = (group: APIAlertGroupT) => {
  return render(
    <MenuContent
      x={0}
      y={0}
      floating={null}
      strategy={"absolute"}
      group={group}
      afterClick={MockAfterClick}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />,
  );
};

describe("<MenuContent />", () => {
  it("clicking on 'Copy' icon copies the link to clickboard", () => {
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderMenuContent(group);
    const buttons = container.querySelectorAll(".dropdown-item");
    fireEvent.click(buttons[0]);
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("clicking on 'Silence' icon opens the silence form modal", () => {
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    group.alertmanagerCount = { am1: 1, ro: 1 };
    const { container } = renderMenuContent(group);
    const buttons = container.querySelectorAll(".dropdown-item");
    fireEvent.click(buttons[1]);
    expect(silenceFormStore.toggle.visible).toBe(true);
    expect(silenceFormStore.data.alertmanagers).toMatchObject([
      { label: "am1", value: ["am1"] },
    ]);
  });

  it("'Silence' menu entry is disabled when all Alertmanager instances are read-only", () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].readonly = true;
    upstreams.instances[2].readonly = true;
    alertStore.data.setUpstreams(upstreams);

    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [],
      [],
      {},
    );
    const { container } = renderMenuContent(group);
    const buttons = container.querySelectorAll(".dropdown-item");
    expect(buttons[1].classList.contains("disabled")).toBe(true);
    fireEvent.click(buttons[1]);
    expect(silenceFormStore.toggle.visible).toBe(false);
  });

  it("renders action annotations when present", () => {
    const group = MockAlertGroup(
      [{ name: "alertname", value: "Fake Alert" }],
      [],
      [
        {
          name: "nonLinkAction",
          value: "nonLinkAction",
          visible: true,
          isLink: false,
          isAction: true,
        },
        {
          name: "linkAction",
          value: "linkAction",
          visible: true,
          isLink: true,
          isAction: true,
        },
        {
          name: "nonLinkNonAction",
          value: "nonLinkNonAction",
          visible: true,
          isLink: false,
          isAction: false,
        },
      ],
      [],
      {},
    );

    const { container } = renderMenuContent(group);
    expect(container.querySelectorAll("a.dropdown-item")).toHaveLength(1);

    const link = container.querySelector("a.dropdown-item[href='linkAction']");
    expect(link?.textContent).toBe("linkAction");

    expect(
      container.querySelector("a.dropdown-item[href='nonLinkNonAction']"),
    ).toBeNull();
  });
});
