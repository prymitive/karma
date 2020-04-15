import React from "react";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__mocks__/Theme";
import { ReloadNeeded } from ".";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

describe("<ReloadNeeded />", () => {
  it("matches snapshot", () => {
    const tree = shallow(
      <ReloadNeeded newVersion="1.2.3" reloadAfter={100000000} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calls window.location.reload after timer is done", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});
    mount(<ReloadNeeded reloadAfter={100000000} />);
    jest.runOnlyPendingTimers();
    expect(reloadSpy).toBeCalled();
  });

  it("timer is cleared on unmount", () => {
    const tree = mount(<ReloadNeeded reloadAfter={100000000} />);
    const instance = tree.instance();

    instance.componentWillUnmount();
    expect(instance.timer).toBeNull();
  });
});
