import { mount } from "enzyme";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";
import { notificationStore } from "Stores/NotificationStore";
import FaviconBadge from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  Favico.badge.mockClear();
  // Clear all notifications
  notificationStore.activeNotifications.forEach((n) =>
    notificationStore.dismissNotification(n.id),
  );
  notificationStore.clearDismissed();
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

  it("badge is ! when there are error notifications", () => {
    // Add an error notification
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledWith("!");
  });

  it("badge is ⚠ when there are warning notifications", () => {
    // Add a warning notification
    notificationStore.addNotification({
      type: "warning",
      title: "Test Warning",
      message: "Test warning message",
      source: "alertmanager",
      sourceId: "test-warning",
    });

    MountedFaviconBadge();
    expect(Favico.badge).toHaveBeenCalledWith("⚠");
  });
});
