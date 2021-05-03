import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { MockAlertGroup, MockAlert } from "__fixtures__/Alerts";
import {
  APIAlertGroupT,
  APIAlertT,
  APIAlertsResponseUpstreamsT,
} from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertMenu, MenuContent } from "./AlertMenu";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let alert: APIAlertT;
let group: APIAlertGroupT;

let MockAfterClick: () => void;
let MockSetIsMenuOpen: () => void;

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 1, healthy: 1, failed: 0 },
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
      version: "0.17.0",
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
      version: "0.17.0",
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
      version: "0.17.0",
      cluster: "am2",
      clusterMembers: ["am2"],
    },
  ],
});

beforeEach(() => {
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  MockAfterClick = jest.fn();
  MockSetIsMenuOpen = jest.fn();

  alert = MockAlert([], { foo: "bar" }, "active");
  group = MockAlertGroup({ alertname: "Fake Alert" }, [alert], [], {}, {});

  alertStore.data.setUpstreams(generateUpstreams());
});

const MountedAlertMenu = (group: APIAlertGroupT) => {
  return mount(
    <AlertMenu
      group={group}
      alert={alert}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      setIsMenuOpen={MockSetIsMenuOpen}
    />
  );
};

describe("<AlertMenu />", () => {
  it("menu content is hidden by default", () => {
    const tree = MountedAlertMenu(group);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    expect(MockSetIsMenuOpen).not.toHaveBeenCalled();
  });

  it("clicking toggle renders menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedAlertMenu(group);
    const toggle = tree.find("span.cursor-pointer");
    toggle.simulate("click");
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("clicking toggle twice hides menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedAlertMenu(group);
    const toggle = tree.find("span.cursor-pointer");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking menu item hides menu content", async () => {
    const promise = Promise.resolve();
    const tree = MountedAlertMenu(group);
    const toggle = tree.find("span.cursor-pointer");

    toggle.simulate("click");
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    tree.find("a.dropdown-item").at(0).simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });
});

const MountedMenuContent = (group: APIAlertGroupT) => {
  return mount(
    <MenuContent
      popperPlacement="top"
      popperRef={jest.fn()}
      popperStyle={{}}
      group={group}
      alert={alert}
      afterClick={MockAfterClick}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<MenuContent />", () => {
  it("clicking on 'Silence' icon opens the silence form modal", () => {
    group.alertmanagerCount = { am1: 1, ro: 1 };
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    button.simulate("click");
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
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    expect(button.hasClass("disabled")).toBe(true);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(false);
  });

  it("source link points at alert source", () => {
    const tree = MountedMenuContent(group);
    const link = tree.find("a.dropdown-item[href='localhost/graph']");
    expect(link.text()).toBe("default");
  });

  it("renders action annotations when present", () => {
    alert = MockAlert(
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
      { foo: "bar" },
      "active"
    );
    group = MockAlertGroup(
      { alertname: "Fake Alert" },
      [alert],
      [
        {
          name: "nonLinkActionShared",
          value: "nonLinkActionShared",
          visible: true,
          isLink: false,
          isAction: true,
        },
        {
          name: "linkActionShared",
          value: "linkActionShared",
          visible: true,
          isLink: true,
          isAction: true,
        },
        {
          name: "nonLinkNonActionShared",
          value: "nonLinkNonActionShared",
          visible: true,
          isLink: false,
          isAction: false,
        },
      ],
      {},
      {}
    );

    const tree = MountedMenuContent(group);
    expect(tree.find("a.dropdown-item")).toHaveLength(3);

    const link1 = tree.find("a.dropdown-item[href='linkAction']");
    expect(link1.text()).toBe("linkAction");

    const link2 = tree.find("a.dropdown-item[href='linkActionShared']");
    expect(link2.text()).toBe("linkActionShared");

    expect(tree.find("a.dropdown-item[href='nonLinkNonAction']")).toHaveLength(
      0
    );
    expect(tree.find("a.dropdown-item[href='nonLinkNonAction']")).toHaveLength(
      0
    );
    expect(
      tree.find("a.dropdown-item[href='nonLinkNonActionShared']")
    ).toHaveLength(0);
    expect(
      tree.find("a.dropdown-item[href='nonLinkNonActionShared']")
    ).toHaveLength(0);
  });
});
