import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { MockAlertGroup, MockAlert } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertMenu, MenuContent } from "./AlertMenu";

let alertStore;
let silenceFormStore;
let alert;
let group;

let MockAfterClick;
let MockSetIsMenuOpen;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  MockAfterClick = jest.fn();
  MockSetIsMenuOpen = jest.fn();

  alert = MockAlert([], { foo: "bar" }, "active");
  group = MockAlertGroup({ alertname: "Fake Alert" }, [alert], [], {}, {});

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

const MountedAlertMenu = (group) => {
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
    const tree = MountedAlertMenu(group);
    const toggle = tree.find("span.cursor-pointer");

    toggle.simulate("click");
    expect(MockSetIsMenuOpen).toHaveBeenCalledTimes(1);
    expect(tree.find("div.dropdown-menu")).toHaveLength(1);

    tree.find("a.dropdown-item").at(0).simulate("click");
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
    alertStore.data.upstreams.instances[0].readonly = true;
    alertStore.data.upstreams.instances[2].readonly = true;
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    expect(button.hasClass("disabled")).toBe(true);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(false);
  });

  it("source link points at alert source", () => {
    const tree = MountedMenuContent(group);
    const link = tree.find("a.dropdown-item[href='localhost/prometheus']");
    expect(link.text()).toBe("default");
  });
});
