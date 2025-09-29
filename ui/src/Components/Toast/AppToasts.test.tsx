import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { notificationStore } from "Stores/NotificationStore";
import AppToasts from "./AppToasts";

let alertStore: AlertStore;

describe("<AppToasts />", () => {
  beforeEach(() => {
    alertStore = new AlertStore([]);
    // Clear all notifications
    notificationStore.activeNotifications.forEach((n) =>
      notificationStore.dismissNotification(n.id),
    );
    notificationStore.clearDismissed();
  });

  it("doesn't render anything when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.setUpgradeNeeded(true);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBeNull();
  });

  it("doesn't render anything when there are no notifications to show", () => {
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBeNull();
  });

  it("renders notification toasts for each active notification", () => {
    // Add two notifications
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error message",
      source: "alertmanager",
      sourceId: "error-1",
    });
    notificationStore.addNotification({
      type: "warning",
      title: "Warning 1",
      message: "First warning message",
      source: "alertmanager",
      sourceId: "warning-1",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("removes notifications when dismissed", () => {
    // Ensure no upgrade needed/ready to avoid extra toasts
    alertStore.info.setUpgradeReady(false);
    alertStore.info.setUpgradeNeeded(false);

    // Add one notification only for simpler testing
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error message",
      source: "alertmanager",
      sourceId: "error-1",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(1);

    // Dismiss the notification
    const activeNotifications = notificationStore.activeNotifications;
    notificationStore.dismissNotification(activeNotifications[0].id);
    tree.update();
    expect(tree.find("Toast")).toHaveLength(0);
  });

  it("renders toasts for notifications with close buttons", () => {
    // Add notifications
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error message",
      source: "alertmanager",
      sourceId: "error-1",
    });

    alertStore.info.setUpgradeNeeded(false);
    alertStore.info.setUpgradeReady(false);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(1);

    // Check that toast has a close button (onClose prop should be present)
    const toastProps = tree.find("Toast").props() as any;
    expect(toastProps.hasClose).toBe(true);
    expect(typeof toastProps.onClose).toBe("function");
  });

  it("renders UpgradeToastMessage when alertStore.info.upgradeReady=true", () => {
    alertStore.info.setUpgradeReady(true);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("UpgradeToastMessage")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("handles notification auto-dismiss when alertStore.info.upgradeNeeded=true", () => {
    // Add a notification first
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    // Then set upgradeNeeded which should cause AppToasts to return null
    alertStore.info.setUpgradeNeeded(true);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBeNull();

    // Notification should still exist in store
    expect(notificationStore.activeNotifications).toHaveLength(1);
  });

  it("displays notification toasts with proper styling", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Critical Error",
      message: "This is a critical error message",
      source: "alertmanager",
      sourceId: "critical-error",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);

    const toast = tree.find("Toast");
    expect(toast).toHaveLength(1);

    const toastProps = toast.props() as any;
    expect(toastProps.hasClose).toBe(true);
    expect(typeof toastProps.onClose).toBe("function");

    // Check that the notification content is present in the rendered HTML
    expect(tree.html()).toContain("Critical Error");
    expect(tree.html()).toContain("This is a critical error message");
  });

  it("calls notification dismissal when toast is closed", () => {
    notificationStore.addNotification({
      type: "warning",
      title: "Test Warning",
      message: "Test warning message",
      source: "alertmanager",
      sourceId: "test-warning",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);
    const toast = tree.find("Toast");
    const toastProps = toast.props() as any;

    // Simulate calling onClose
    toastProps.onClose();

    // Notification should be dismissed
    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("displays occurrence count badge for repeated notifications in toasts", () => {
    // Add a notification multiple times to get occurrence count > 1
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Error",
      message: "This error keeps occurring",
      source: "alertmanager",
      sourceId: "repeated-error",
    });

    // Add the same notification again
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Error",
      message: "This error keeps occurring",
      source: "alertmanager",
      sourceId: "repeated-error",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);

    // Check that the occurrence count badge is present
    const badge = tree.find(".badge.bg-secondary");
    expect(badge).toHaveLength(1);
    expect(badge.text()).toBe("2x");

    // Verify the notification content is still there
    expect(tree.text()).toContain("Repeated Error");
  });

  it("does not display occurrence count badge for single occurrence notifications in toasts", () => {
    notificationStore.addNotification({
      type: "warning",
      title: "Single Warning",
      message: "This warning happened once",
      source: "alertmanager",
      sourceId: "single-warning",
    });

    const tree = mount(<AppToasts alertStore={alertStore} />);

    // Should not have occurrence count badge for count = 1
    const badge = tree.find(".badge.bg-secondary");
    expect(badge).toHaveLength(0);

    // Verify the notification content is still there
    expect(tree.text()).toContain("Single Warning");
  });
});
