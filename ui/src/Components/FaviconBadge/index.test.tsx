import { mount } from "enzyme";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";
import FaviconBadge from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  Favico.badge.mockClear();
});

const MountedFaviconBadge = () => {
  return mount(<FaviconBadge alertStore={alertStore} />);
};

describe("<FaviconBadge />", () => {
  it("badge is updated on mount", () => {
    alertStore.info.setTotalAlerts(99);
    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith(99);
  });

  it("badge is updated when alertStore.info.totalAlerts changes", () => {
    alertStore.info.setTotalAlerts(99);
    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith(99);

    alertStore.info.setTotalAlerts(100);
    expect(Favico.badge).toHaveBeenCalledTimes(2);
    expect(Favico.badge).toHaveBeenLastCalledWith(100);
  });

  it("badge is updated when alertStore.status.error changes", () => {
    alertStore.status.setError("foo");
    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith("?");
  });
});
