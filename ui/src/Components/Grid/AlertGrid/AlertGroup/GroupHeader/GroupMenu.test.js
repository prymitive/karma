import React from "react";

import { Provider } from "mobx-react";

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
});

const MockAfterClick = jest.fn();

const MountedGroupMenu = group => {
  return mount(
    <Provider alertStore={alertStore}>
      <GroupMenu group={group} silenceFormStore={silenceFormStore} />
    </Provider>
  ).find("GroupMenu");
};

describe("<GroupMenu />", () => {
  it("is collapsed by default", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {});
    const tree = MountedGroupMenu(group);
    expect(tree.instance().collapse.value).toBe(true);
  });

  it("clicking toggle sets collapse value to 'false'", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {});
    const tree = MountedGroupMenu(group);
    const toggle = tree.find("a.cursor-pointer");
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);
  });

  it("handleClickOutside() call sets collapse value to 'true'", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {});
    const tree = MountedGroupMenu(group);

    const toggle = tree.find("a.cursor-pointer");
    toggle.simulate("click");
    expect(tree.instance().collapse.value).toBe(false);

    tree.instance().handleClickOutside();

    expect(tree.instance().collapse.value).toBe(true);
  });
});

const MountedMenuContent = group => {
  return mount(
    <Provider alertStore={alertStore}>
      <MenuContent
        popperPlacement="top"
        popperRef={null}
        popperStyle={{}}
        group={group}
        afterClick={MockAfterClick}
        silenceFormStore={silenceFormStore}
      />
    </Provider>
  );
};

describe("<MenuContent />", () => {
  it("clicking on 'Copy' icon copies the link to clickboard", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {});
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(0);
    button.simulate("click");
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("clicking on 'Silence' icon opens the silence form modal", () => {
    const group = MockAlertGroup({ alertname: "Fake Alert" }, [], [], {});
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(1);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(true);
  });
});
