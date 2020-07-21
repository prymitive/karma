import React from "react";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__mocks__/Theme";
import { UpgradeNeeded } from ".";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

describe("<UpgradeNeeded />", () => {
  it("matches snapshot", () => {
    const tree = shallow(
      <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calls window.location.reload after timer is done", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});
    mount(<UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />);
    jest.runOnlyPendingTimers();
    expect(reloadSpy).toBeCalled();
  });

  it("stops calling window.location.reload after unmount", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});
    const tree = mount(
      <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />
    );
    tree.unmount();
    jest.runOnlyPendingTimers();
    expect(reloadSpy).not.toBeCalled();
  });
});
