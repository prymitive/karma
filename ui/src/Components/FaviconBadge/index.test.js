import React from "react";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { FaviconBadge } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedFaviconBadge = () => {
  return mount(<FaviconBadge alertStore={alertStore} />);
};

describe("<FaviconBadge />", () => {
  it("creates Favico instance on mount", () => {
    const tree = MountedFaviconBadge();
    const instance = tree.instance();
    expect(instance.favicon).toBeInstanceOf(Object);
  });

  it("updateBadge is called when alertStore.info.totalAlerts changes", () => {
    const tree = MountedFaviconBadge();
    const instance = tree.instance();
    const updateSpy = jest.spyOn(instance, "updateBadge");
    alertStore.info.totalAlerts = 99;
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("updateBadge is called when alertStore.status.error changes", () => {
    const tree = MountedFaviconBadge();
    const instance = tree.instance();
    const updateSpy = jest.spyOn(instance, "updateBadge");
    alertStore.status.error = "foo";
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
