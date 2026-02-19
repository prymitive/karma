import { render } from "@testing-library/react";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";
import FaviconBadge from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  Favico.badge.mockClear();
});

const renderFaviconBadge = () => {
  return render(<FaviconBadge alertStore={alertStore} />);
};

describe("<FaviconBadge />", () => {
  it("badge is updated on mount", () => {
    alertStore.info.setTotalAlerts(99);
    renderFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith(99);
  });

  it("badge is updated when alertStore.info.totalAlerts changes", () => {
    alertStore.info.setTotalAlerts(99);
    renderFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith(99);

    alertStore.info.setTotalAlerts(100);
    expect(Favico.badge).toHaveBeenCalledTimes(2);
    expect(Favico.badge).toHaveBeenLastCalledWith(100);
  });

  it("badge is updated when alertStore.status.error changes", () => {
    alertStore.status.setError("foo");
    renderFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledTimes(1);
    expect(Favico.badge).toHaveBeenCalledWith("?");
  });

  it("badge is ! when there are alertmanager upstreams with errors", () => {
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 1, failed: 0 },
      clusters: { default: ["default"] },
      instances: [
        {
          name: "default",
          uri: "http://localhost",
          publicURI: "http://example.com",
          readonly: false,
          headers: { foo: "bar" },
          corsCredentials: "include",
          error: 'Healthcheck filter "DeadMansSwitch" didn\'t match any alerts',
          version: "0.24.0",
          cluster: "default",
          clusterMembers: ["default"],
        },
      ],
    });
    renderFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledWith("!");
  });
});
