import React from "react";

import { mount } from "enzyme";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";
import { FaviconBadge } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  Favico.badge.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedFaviconBadge = () => {
  return mount(<FaviconBadge alertStore={alertStore} />);
};

describe("<FaviconBadge />", () => {
  it("badge is updated when alertStore.info.totalAlerts changes", () => {
    alertStore.info.totalAlerts = 99;
    const tree = MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith(99);
  });

  it("badge is updated when alertStore.status.error changes", () => {
    alertStore.status.error = "foo";
    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith("?");
  });
});
