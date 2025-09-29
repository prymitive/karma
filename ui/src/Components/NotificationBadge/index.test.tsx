import { mount } from "enzyme";

import { notificationStore } from "Stores/NotificationStore";
import { NotificationBadge } from ".";

beforeEach(() => {
  // Clear all notifications
  notificationStore.activeNotifications.forEach((n) =>
    notificationStore.dismissNotification(n.id),
  );
  notificationStore.clearDismissed();
});

const MountedNotificationBadge = () => {
  return mount(<NotificationBadge />);
};

describe("<NotificationBadge />", () => {
  it("doesn't render when there are no notifications", () => {
    const tree = MountedNotificationBadge();
    expect(tree.find("li")).toHaveLength(0);
  });

  it("renders notification badge when there are active notifications", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();
    expect(tree.find("li")).toHaveLength(1);
    expect(tree.find("FontAwesomeIcon")).toHaveLength(1);
    expect(tree.find(".badge")).toHaveLength(1);
  });

  it("shows correct count for error notifications", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error",
      source: "alertmanager",
      sourceId: "error-1",
    });

    notificationStore.addNotification({
      type: "error",
      title: "Error 2",
      message: "Second error",
      source: "alertmanager",
      sourceId: "error-2",
    });

    const tree = MountedNotificationBadge();
    expect(tree.find(".badge").text()).toBe("2");
    expect(tree.find(".bg-danger")).toHaveLength(1);
  });

  it("shows correct count for warning notifications", () => {
    notificationStore.addNotification({
      type: "warning",
      title: "Warning 1",
      message: "First warning",
      source: "alertmanager",
      sourceId: "warning-1",
    });

    const tree = MountedNotificationBadge();
    expect(tree.find(".badge").text()).toBe("1");
    expect(tree.find(".bg-warning")).toHaveLength(1);
  });

  it("prioritizes errors over warnings in badge color", () => {
    notificationStore.addNotification({
      type: "warning",
      title: "Warning 1",
      message: "Warning message",
      source: "alertmanager",
      sourceId: "warning-1",
    });

    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "Error message",
      source: "alertmanager",
      sourceId: "error-1",
    });

    const tree = MountedNotificationBadge();
    expect(tree.find(".badge").text()).toBe("2");
    expect(tree.find(".bg-danger")).toHaveLength(1);
    expect(tree.find(".bg-warning")).toHaveLength(0);
  });

  it("toggles dropdown when clicked", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();

    // Initially no dropdown
    expect(tree.find(".dropdown-menu")).toHaveLength(0);

    // Click to open dropdown
    tree.find("span.nav-link").simulate("click");
    tree.update();
    expect(tree.find(".dropdown-menu")).toHaveLength(1);

    // Click again to close dropdown
    tree.find("span.nav-link").simulate("click");
    tree.update();
    expect(tree.find(".dropdown-menu")).toHaveLength(0);
  });

  it("shows active notifications in dropdown", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    notificationStore.addNotification({
      type: "warning",
      title: "Test Warning",
      message: "Test warning message",
      source: "alertmanager",
      sourceId: "test-warning",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown).toHaveLength(1);
    expect(dropdown.text()).toContain("Test Error");
    expect(dropdown.text()).toContain("Test Warning");
    expect(dropdown.text()).toContain("1 errors");
    expect(dropdown.text()).toContain("1 warnings");
  });

  it("allows individual notification dismissal", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Find and click dismiss button on notification item
    const dismissButton = tree.find(".alert button");
    expect(dismissButton).toHaveLength(1);
    dismissButton.simulate("click");

    // Check notification is dismissed
    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("allows dismissing all notifications", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error",
      source: "alertmanager",
      sourceId: "error-1",
    });

    notificationStore.addNotification({
      type: "warning",
      title: "Warning 1",
      message: "First warning",
      source: "alertmanager",
      sourceId: "warning-1",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Find and click "Dismiss All" button
    const dismissAllButton = tree
      .find("button")
      .filterWhere((n) => n.text() === "Dismiss All");
    expect(dismissAllButton).toHaveLength(1);
    dismissAllButton.simulate("click");

    // Check all notifications are dismissed
    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("shows dismissed notifications in history", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    // Dismiss the notification
    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId);

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Recent (1)");
    expect(dropdown.text()).toContain("Test Error");
  });

  it("allows clearing notification history", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    // Dismiss the notification
    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId);

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Find and click "Clear History" button
    const clearHistoryButton = tree
      .find("button")
      .filterWhere((n) => n.text() === "Clear History");
    expect(clearHistoryButton).toHaveLength(1);
    clearHistoryButton.simulate("click");

    // Check history is cleared
    expect(notificationStore.dismissedNotifications).toHaveLength(0);
  });

  it("closes dropdown when close button is clicked", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Dropdown should be open
    expect(tree.find(".dropdown-menu")).toHaveLength(1);

    // Find and click close button
    const closeButton = tree
      .find("button")
      .filterWhere(
        (n) =>
          n.find("FontAwesomeIcon").length > 0 && n.props().title === "Close",
      );
    expect(closeButton).toHaveLength(1);
    closeButton.simulate("click");
    tree.update();

    // Dropdown should be closed
    expect(tree.find(".dropdown-menu")).toHaveLength(0);
  });

  it("closes dropdown when clicking outside", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Dropdown should be open
    expect(tree.find(".dropdown-menu")).toHaveLength(1);

    // Click on the overlay
    const overlay = tree.find("div.position-fixed");
    expect(overlay).toHaveLength(1);
    overlay.simulate("click");
    tree.update();

    // Dropdown should be closed
    expect(tree.find(".dropdown-menu")).toHaveLength(0);
  });

  it("shows appropriate message when no notifications exist", () => {
    const tree = MountedNotificationBadge();

    // Add a notification to make badge visible
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    // Dismiss it to have history
    notificationStore.dismissNotification(
      notificationStore.activeNotifications[0].id,
    );

    tree.update();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("No active notifications");
  });

  it("shows mixed error and warning counts correctly", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Error 1",
      message: "First error",
      source: "alertmanager",
      sourceId: "error-1",
    });

    notificationStore.addNotification({
      type: "error",
      title: "Error 2",
      message: "Second error",
      source: "alertmanager",
      sourceId: "error-2",
    });

    notificationStore.addNotification({
      type: "warning",
      title: "Warning 1",
      message: "First warning",
      source: "alertmanager",
      sourceId: "warning-1",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("2 errors");
    expect(dropdown.text()).toContain("1 warnings");
    expect(dropdown.text()).toContain(", "); // Tests the comma separator
  });

  it("handles notification store with only dismissed notifications", () => {
    // Add and immediately dismiss a notification
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    notificationStore.dismissNotification(
      notificationStore.activeNotifications[0].id,
    );

    const tree = MountedNotificationBadge();

    // Should still render because we have dismissed notifications
    expect(tree.find("li")).toHaveLength(1);

    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("No active notifications");
    expect(dropdown.text()).toContain("Recent (1)");
  });

  it("closes dropdown on close button click with keyboard event", () => {
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    // Find close button and simulate keyDown event
    const closeButton = tree
      .find("button")
      .filterWhere(
        (n) =>
          n.find("FontAwesomeIcon").length > 0 && n.props().title === "Close",
      );

    closeButton.simulate("keyDown", { key: "Enter" });
    tree.update();

    // Should still be open (only click closes it)
    expect(tree.find(".dropdown-menu")).toHaveLength(1);
  });

  it("renders badge with no count when totalCount is 0", () => {
    // Add notification then dismiss it
    notificationStore.addNotification({
      type: "error",
      title: "Test Error",
      message: "Test error message",
      source: "alertmanager",
      sourceId: "test-error",
    });

    notificationStore.dismissNotification(
      notificationStore.activeNotifications[0].id,
    );

    const tree = MountedNotificationBadge();

    // Should render the icon but no badge count
    expect(tree.find("FontAwesomeIcon")).toHaveLength(1);
    expect(tree.find(".badge")).toHaveLength(0);
  });

  it('shows "(auto-resolved)" label for auto-dismissed notifications', () => {
    // Add a notification
    notificationStore.addNotification({
      type: "warning",
      title: "Auto-resolved Warning",
      message: "This warning was automatically resolved",
      source: "alertmanager",
      sourceId: "auto-warning",
    });

    // Auto-dismiss the notification (second parameter true indicates auto-dismiss)
    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId, true);

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Auto-resolved Warning");
    expect(dropdown.text()).toContain("(auto-resolved)");
  });

  it('does not show "(auto-resolved)" label for manually dismissed notifications', () => {
    // Add a notification
    notificationStore.addNotification({
      type: "error",
      title: "Manual Dismissal Error",
      message: "This error was manually dismissed",
      source: "alertmanager",
      sourceId: "manual-error",
    });

    // Manually dismiss the notification (second parameter false or omitted)
    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId, false);

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Manual Dismissal Error");
    expect(dropdown.text()).not.toContain("(auto-resolved)");
  });

  it("shows occurrence count badge for repeated dismissed notifications", () => {
    // Add a notification and dismiss it
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Error",
      message: "This error keeps happening",
      source: "alertmanager",
      sourceId: "repeated-error",
    });

    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId);

    // Add the same notification again (should increment occurrence count)
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Error",
      message: "This error keeps happening",
      source: "alertmanager",
      sourceId: "repeated-error",
    });

    // Add it one more time to get count = 3
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Error",
      message: "This error keeps happening",
      source: "alertmanager",
      sourceId: "repeated-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Repeated Error");

    // Check for occurrence count badge
    const badges = tree.find(".badge.bg-secondary");
    expect(badges).toHaveLength(1);
    expect(badges.text()).toBe("3x");
  });

  it("does not show occurrence count badge for single occurrence", () => {
    // Add and dismiss a notification with occurrence count = 1
    notificationStore.addNotification({
      type: "warning",
      title: "Single Warning",
      message: "This warning happened once",
      source: "alertmanager",
      sourceId: "single-warning",
    });

    const notificationId = notificationStore.activeNotifications[0].id;
    notificationStore.dismissNotification(notificationId);

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Single Warning");

    // Should not show occurrence count badge for count = 1
    const badges = tree.find(".badge.bg-secondary");
    expect(badges).toHaveLength(0);
  });

  it("shows occurrence count badge for active notifications with multiple occurrences", () => {
    // Add a notification
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Active Error",
      message: "This error keeps happening",
      source: "alertmanager",
      sourceId: "active-error",
    });

    // Add the same notification again (should increment occurrence count)
    notificationStore.addNotification({
      type: "error",
      title: "Repeated Active Error",
      message: "This error keeps happening",
      source: "alertmanager",
      sourceId: "active-error",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Repeated Active Error");

    // Check for occurrence count badge on active notification
    const badges = tree.find(".badge.bg-secondary");
    expect(badges).toHaveLength(1);
    expect(badges.text()).toBe("2x");
  });

  it("does not show occurrence count badge for single occurrence active notifications", () => {
    // Add a notification with single occurrence
    notificationStore.addNotification({
      type: "warning",
      title: "Single Active Warning",
      message: "This warning happened once",
      source: "alertmanager",
      sourceId: "single-active-warning",
    });

    const tree = MountedNotificationBadge();
    tree.find("span.nav-link").simulate("click");
    tree.update();

    const dropdown = tree.find(".dropdown-menu");
    expect(dropdown.text()).toContain("Single Active Warning");

    // Should not show occurrence count badge for count = 1
    const badges = tree.find(".badge.bg-secondary");
    expect(badges).toHaveLength(0);
  });
});
