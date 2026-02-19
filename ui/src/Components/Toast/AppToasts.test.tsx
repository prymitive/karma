import { render, screen, fireEvent } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";
import AppToasts from "./AppToasts";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const makeErrors = () => {
  alertStore.data.setUpstreams({
    counters: { total: 3, healthy: 0, failed: 3 },
    instances: [
      {
        name: "am1",
        cluster: "am1",
        clusterMembers: ["am1"],
        uri: "http://am1",
        publicURI: "http://am1",
        error: "error 1",
        version: "0.24.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
      {
        name: "am2",
        cluster: "am2",
        clusterMembers: ["am2"],
        uri: "file:///mock",
        publicURI: "file:///mock",
        error: "",
        version: "0.24.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
      {
        name: "am3",
        cluster: "am3",
        clusterMembers: ["am3"],
        uri: "http://am3",
        publicURI: "http://am3",
        error: "error 2",
        version: "0.24.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
    ],
    clusters: { am1: ["am1"], am2: ["am2"], am3: ["am3"] },
  });
};

describe("<AppToasts />", () => {
  it("doesn't render anything when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.setUpgradeNeeded(true);
    const { container } = render(<AppToasts alertStore={alertStore} />);
    expect(container.innerHTML).toBe("");
  });

  it("doesn't render anything when there are no notifications to show", () => {
    const { container } = render(<AppToasts alertStore={alertStore} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders upstream error toasts for each unhealthy upstream", () => {
    makeErrors();
    const { asFragment } = render(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll(".bg-toast")).toHaveLength(2);
    expect(asFragment()).toMatchSnapshot();
  });

  it("doesn't render upstream error toasts if not all instances are down", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 1, failed: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "error 1",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "file:///mock",
          publicURI: "file:///mock",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am: ["am1", "am2"] },
    });
    const { asFragment } = render(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll(".bg-toast")).toHaveLength(0);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders upstream error toasts if all instances are down", () => {
    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 0, failed: 3 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "error 1",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am1", "am2"],
          uri: "file:///mock",
          publicURI: "file:///mock",
          error: "error 2",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am: ["am1", "am2"] },
    });
    const { asFragment } = render(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll(".bg-toast")).toHaveLength(2);
    expect(asFragment()).toMatchSnapshot();
  });

  it("removes notifications when upstream recovers", () => {
    makeErrors();
    const { rerender } = render(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll(".bg-toast")).toHaveLength(2);

    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 3, failed: 0 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am2"],
          uri: "file:///mock",
          publicURI: "file:///mock",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am3",
          cluster: "am",
          clusterMembers: ["am3"],
          uri: "http://am3",
          publicURI: "http://am3",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"], am2: ["am2"], am3: ["am3"] },
    });
    rerender(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll(".bg-toast")).toHaveLength(0);
  });

  it("clicking navbar icon toggles all notifications", () => {
    makeErrors();
    alertStore.info.setUpgradeNeeded(false);
    alertStore.info.setUpgradeReady(false);
    const { container } = render(<AppToasts alertStore={alertStore} />);
    expect(document.body.querySelectorAll("div.bg-toast")).toHaveLength(2);
    expect(
      document.body.querySelectorAll("span.badge.cursor-pointer.with-click"),
    ).toHaveLength(2);

    const closeBtns = document.body.querySelectorAll(
      "span.badge.cursor-pointer.with-click",
    );
    fireEvent.click(closeBtns[1]);
    expect(document.body.querySelectorAll("div.bg-toast")).toHaveLength(1);

    const notificationsIcon = container.querySelector(
      "span#components-notifications",
    );
    fireEvent.click(notificationsIcon!);
    expect(document.body.querySelectorAll("div.bg-toast")).toHaveLength(2);
  });

  it("renders UpgradeToastMessage when alertStore.info.upgradeReady=true", () => {
    alertStore.info.setUpgradeReady(true);
    const { asFragment } = render(<AppToasts alertStore={alertStore} />);
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });
});
