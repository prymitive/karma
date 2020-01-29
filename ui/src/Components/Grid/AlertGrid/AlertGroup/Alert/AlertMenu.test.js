import React from "react";

import { mount } from "enzyme";

import { MockAlertGroup, MockAlert } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertMenu, MenuContent } from "./AlertMenu";

let alertStore;
let silenceFormStore;
let alert;
let group;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  alert = MockAlert([], { foo: "bar" }, "active");
  group = MockAlertGroup({ alertname: "Fake Alert" }, [alert], [], {}, {});

  alertStore.data.upstreams = {
    clusters: { default: ["am1"] },
    instances: [
      {
        name: "am1",
        uri: "http://localhost:8080",
        publicURI: "http://example.com",
        readonly: false,
        headers: {},
        error: "",
        version: "0.15.0",
        cluster: "default",
        clusterMembers: ["am1"]
      }
    ]
  };
});

const MockAfterClick = jest.fn();
const MockSetIsMenuOpen = jest.fn();

const MountedAlertMenu = group => {
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
  it("is collapsed by default", () => {
    const tree = MountedAlertMenu(group);
    expect(tree.instance().collapse.value).toBe(true);
  });

  it("clicking toggle sets collapse value to 'false'", () => {
    const tree = MountedAlertMenu(group);
    const toggle = tree.find(".cursor-pointer");
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);
  });

  it("handleClickOutside() call sets collapse value to 'true'", () => {
    const tree = MountedAlertMenu(group);
    const toggle = tree.find(".cursor-pointer");
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);

    tree.instance().handleClickOutside();

    expect(tree.instance().collapse.value).toBe(true);
  });
});

const MountedMenuContent = group => {
  return mount(
    <MenuContent
      popperPlacement="top"
      popperRef={null}
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
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(true);
  });

  it("'Silence' menu entry is disabled when all Alertmanager instances are read-only", () => {
    alertStore.data.upstreams.instances[0].readonly = true;
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
