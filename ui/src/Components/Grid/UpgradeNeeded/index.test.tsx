import React from "react";
import { act } from "react-dom/test-utils";

import { mount, shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { UpgradeNeeded } from ".";

declare let window: any;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);

  delete window.location;
  window.location = { reload: jest.fn() };
});

afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

describe("<UpgradeNeeded />", () => {
  it("matches snapshot", () => {
    const tree = shallow(
      <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />,
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calls window.location.reload after timer is done", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});

    mount(<UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />);

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(reloadSpy).toBeCalled();
  });

  it("stops calling window.location.reload after unmount", () => {
    const reloadSpy = jest
      .spyOn(global.window.location, "reload")
      .mockImplementation(() => {});

    const tree = mount(
      <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />,
    );
    expect(reloadSpy).not.toBeCalled();

    act(() => {
      tree.unmount();
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(reloadSpy).not.toBeCalled();
  });
});
