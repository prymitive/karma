import React from "react";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { UpgradeNeeded } from ".";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.clearAllTimers();
});

describe("<UpgradeNeeded />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<UpgradeNeeded newVersion="1.2.3" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calls window.location.reload after timer is done", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});
    mount(<UpgradeNeeded newVersion="1.2.3" />);
    jest.runOnlyPendingTimers();
    expect(reloadSpy).toBeCalled();
  });

  it("timer is cleared on unmount", () => {
    const tree = mount(<UpgradeNeeded newVersion="1.2.3" />);
    const instance = tree.instance();

    instance.componentWillUnmount();
    expect(instance.timer).toBeNull();
  });
});
