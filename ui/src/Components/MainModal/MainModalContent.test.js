import React from "react";
import ReactDOM from "react-dom";
import renderer from "react-test-renderer";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModalContent } from "./MainModalContent";

let alertStore;
let settingsStore;
const onHide = jest.fn();

beforeAll(() => {
  // modal renders into document.body using portals, but that isn't working
  // out of the box with react-test-renderer, a workaround is needed based on
  // https://github.com/facebook/react/issues/11565#issuecomment-380143358
  ReactDOM.createPortal = jest.fn((element, node) => {
    return element;
  });
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  onHide.mockClear();
});

afterEach(() => {
  // https://github.com/facebook/react/issues/11565#issuecomment-380143358
  ReactDOM.createPortal.mockClear();
});

const FakeModal = () => {
  return renderer.create(
    <MainModalContent
      alertStore={alertStore}
      settingsStore={settingsStore}
      onHide={onHide}
    />
  );
};

const ValidateSetTab = (title, callArg) => {
  const component = FakeModal();
  const instance = component.getInstance();
  const setTabSpy = jest.spyOn(instance.tab, "setTab");

  const helpTab = component.root.findByProps({ title: title });
  helpTab.props.onClick();

  expect(setTabSpy).toHaveBeenCalledWith(callArg);
};

describe("<MainModalContent />", () => {
  it("matches snapshot", () => {
    const tree = FakeModal().toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("shows 'Configuration' tab by default", () => {
    const component = FakeModal();
    const tabs = component.root.findAll(testInstance => {
      if (!testInstance.props.className) return false;
      const classNames = testInstance.props.className.split(" ");
      return classNames.includes("nav-link") && classNames.includes("active");
    });
    expect(tabs).toHaveLength(1);
    expect(tabs[0].children).toContain("Configuration");
  });

  // modal makes it tricky to verify re-rendered content, so only check if we
  // update the store for now
  it("calls setTab('configuration') after clicking on the 'Configuration' tab", () => {
    ValidateSetTab("Configuration", "configuration");
  });

  it("calls setTab('help') after clicking on the 'Help' tab", () => {
    ValidateSetTab("Help", "help");
  });
});
