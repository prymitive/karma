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

  it("timer is cleared on unmount", () => {
    const tree = mount(
      <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />
    );
    const instance = tree.instance();

    instance.componentWillUnmount();
    expect(instance.timer).toBeNull();
  });
});
