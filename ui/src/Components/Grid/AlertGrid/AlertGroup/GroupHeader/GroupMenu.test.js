import React from "react";

import { mount } from "enzyme";

import copy from "copy-to-clipboard";

import { MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GroupMenu, MenuContent } from "./GroupMenu";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

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

const MountedGroupMenu = (group, themed) => {
  return mount(
    <GroupMenu
      group={group}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      themed={themed}
      setIsMenuOpen={MockSetIsMenuOpen}
    />
  ).find("GroupMenu");
};

describe("<GroupMenu />", () => {
  it("is collapsed by default", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    expect(tree.instance().collapse.value).toBe(true);
  });

  it("clicking toggle sets collapse value to 'false'", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);
    const toggle = tree.find(".cursor-pointer");
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);
  });

  it("handleClickOutside() call sets collapse value to 'true'", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedGroupMenu(group, true);

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
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(true);
  });

  it("'Silence' menu entry is disabled when all Alertmanager instances are read-only", () => {
    alertStore.data.upstreams.instances[0].readonly = true;

    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {}, {});
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    expect(button.hasClass("disabled")).toBe(true);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(false);
  });
});
