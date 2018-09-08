import React from "react";

import { mount } from "enzyme";

import { MockAlertGroup, MockAlert } from "__mocks__/Alerts.js";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertMenu, MenuContent } from "./AlertMenu";

let silenceFormStore;
let alert;
let group;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  alert = MockAlert([], { foo: "bar" }, "active");
  group = MockAlertGroup({ alertname: "Fake Alert" }, [alert], [], {});
});

const MockAfterClick = jest.fn();

const MountedAlertMenu = group => {
  return mount(
    <AlertMenu
      group={group}
      alert={alert}
      silenceFormStore={silenceFormStore}
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
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<MenuContent />", () => {
  it("clicking on 'Silence' icon opens the silence form modal", () => {
    const tree = MountedMenuContent(group);
    const button = tree.find(".dropdown-item").at(0);
    button.simulate("click");
    expect(silenceFormStore.toggle.visible).toBe(true);
  });
});
