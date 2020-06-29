import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import copy from "copy-to-clipboard";

import { MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GroupMenu, MenuContent } from "./GroupMenu";

let alertStore;
let silenceFormStore;

let MockAfterClick;
let MockSetIsMenuOpen;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  jest.clearAllMocks();
  MockAfterClick = jest.fn();
  MockSetIsMenuOpen = jest.fn();

  alertStore.data.upstreams = {
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
  };
});

const MountedGroupMenu = (group, themed) => {
  return mount(
    <GroupMenu
      group={group}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      themed={themed}
      setIsMenuOpen={MockSetIsMenuOpen}
    />
  );
};

describe("<GroupMenu />", () => {
  it("menu content is hidden by default", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    expect(MockSetIsMenuOpen).not.toHaveBeenCalled();
  });

  it("clicking toggle renders menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    const toggle = tree.find("span.cursor-pointer");
    toggle.simulate("click");
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("clicking toggle twice hides menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    const toggle = tree.find("span.cursor-pointer");

    toggle.simulate("click");
    jest.runOnlyPendingTimers();
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    toggle.simulate("click");
    jest.runOnlyPendingTimers();
    tree.update();
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking menu item hides menu content", async () => {
    const promise = Promise.resolve();
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    const toggle = tree.find("span.cursor-pointer");

    toggle.simulate("click");
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    tree.find("div.dropdown-item").at(0).simulate("click");
    jest.runOnlyPendingTimers();
    tree.update();
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(2);
    expect(tree.find("div.dropdown-menu")).toHaveLength(0);
    await act(() => promise);
  });
});

const MountedMenuContent = (group) => {
  return mount(
    <MenuContent
      popperPlacement="top"
      popperRef={jest.fn()}
      popperStyle={{}}
      group={group}
      afterClick={MockAfterClick}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<MenuContent />", () => {
  it("clicking on 'Copy' icon copies the link to clickboard", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(0);
    button.simulate("click");
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("clicking on 'Silence' icon opens the silence form modal", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
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
    alertStore.data.upstreams.instances[0].readonly = true;
    alertStore.data.upstreams.instances[2].readonly = true;

    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    expect(button.hasClass("disabled")).toBe(true);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(false);
  });
});
