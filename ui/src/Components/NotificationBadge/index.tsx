import type { FC } from "react";
import { useState, useCallback } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { notificationStore } from "Stores/NotificationStore";
import type { NotificationT } from "Stores/NotificationStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { NotificationContent } from "Components/Notification/NotificationContent";

const NotificationItem: FC<{
  notification: NotificationT;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => (
  <div
    className={`alert alert-${notification.type === "error" ? "danger" : "warning"} alert-dismissible mb-2`}
  >
    <div className="d-flex align-items-start">
      <FontAwesomeIcon
        icon={
          notification.type === "error"
            ? faExclamationCircle
            : faExclamationTriangle
        }
        className="me-2 mt-1"
      />
      <NotificationContent
        title={notification.title}
        message={notification.message}
        timestamp={notification.timestamp}
        occurrenceCount={notification.occurrenceCount}
      />
      <button
        type="button"
        className="btn-close"
        onClick={() => onDismiss(notification.id)}
      ></button>
    </div>
  </div>
);

const NotificationBadge: FC = observer(() => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleToggleDropdown = useCallback(() => {
    setShowDropdown(!showDropdown);
  }, [showDropdown]);

  const handleDismissNotification = useCallback((id: string) => {
    notificationStore.dismissNotification(id, false);
  }, []);

  const handleDismissAll = useCallback(() => {
    notificationStore.activeNotifications.forEach((notification) => {
      notificationStore.dismissNotification(notification.id, false);
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    notificationStore.clearDismissed();
  }, []);

  const totalCount = notificationStore.totalActiveCount;
  const errorCount = notificationStore.errorCount;
  const warningCount = notificationStore.warningCount;

  if (
    totalCount === 0 &&
    notificationStore.dismissedNotifications.length === 0
  ) {
    return null;
  }

  return (
    <li className="nav-item dropdown">
      <TooltipWrapper title={`${totalCount} active notifications`}>
        <span
          className="nav-link cursor-pointer position-relative"
          onClick={handleToggleDropdown}
        >
          <FontAwesomeIcon icon={faExclamationCircle} fixedWidth />
          {totalCount > 0 && (
            <span
              className={`position-absolute badge rounded-pill ${
                errorCount > 0 ? "bg-danger" : "bg-warning"
              }`}
              style={{
                fontSize: "0.6rem",
                top: "-2px",
                right: "-6px",
                minWidth: "16px",
                height: "16px",
                lineHeight: "16px",
                padding: "0",
              }}
            >
              {totalCount}
            </span>
          )}
        </span>
      </TooltipWrapper>

      {showDropdown && (
        <div
          className="dropdown-menu dropdown-menu-end show position-absolute"
          style={{
            minWidth: "min(400px, 90vw)",
            maxWidth: "min(500px, 95vw)",
            maxHeight: "60vh",
            overflowY: "auto",
            marginTop: "0.5rem",
            right: "0",
            left: "auto",
            zIndex: 1050,
          }}
        >
          <div className="dropdown-header d-flex justify-content-between align-items-center">
            <span>
              Notifications
              {totalCount > 0 && (
                <span className="ms-1">
                  (
                  {errorCount > 0 && (
                    <span className="text-danger">{errorCount} errors</span>
                  )}
                  {errorCount > 0 && warningCount > 0 && ", "}
                  {warningCount > 0 && (
                    <span className="text-warning">
                      {warningCount} warnings
                    </span>
                  )}
                  )
                </span>
              )}
            </span>
            <div className="d-flex gap-2">
              {totalCount > 0 && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleDismissAll}
                >
                  Dismiss All
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowDropdown(false)}
                title="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="px-3 py-2">
            {notificationStore.activeNotifications.length > 0 ? (
              <>
                <h6 className="text-muted mb-2">
                  Active ({notificationStore.activeNotifications.length})
                </h6>
                {notificationStore.activeNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={handleDismissNotification}
                  />
                ))}
              </>
            ) : (
              <div className="text-center text-muted py-3">
                <FontAwesomeIcon
                  icon={faExclamationCircle}
                  size="2x"
                  className="mb-2 opacity-50"
                />
                <p className="mb-0">No active notifications</p>
              </div>
            )}

            {notificationStore.dismissedNotifications.length > 0 && (
              <>
                <div className="dropdown-divider my-3"></div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-muted mb-0">
                    Recent ({notificationStore.dismissedNotifications.length})
                  </h6>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClearHistory}
                  >
                    Clear History
                  </button>
                </div>
                {notificationStore.dismissedNotifications.map(
                  (notification) => (
                    <div
                      key={notification.id}
                      className="text-muted mb-2 p-2 rounded"
                      style={{ backgroundColor: "#f8f9fa" }}
                    >
                      <div className="d-flex align-items-start">
                        <FontAwesomeIcon
                          icon={
                            notification.type === "error"
                              ? faExclamationCircle
                              : faExclamationTriangle
                          }
                          className="me-2 mt-1 opacity-50"
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center">
                            <small
                              className="fw-bold flex-grow-1"
                              dangerouslySetInnerHTML={{
                                __html: String(notification.title),
                              }}
                            ></small>
                            {notification.occurrenceCount > 1 && (
                              <span className="badge bg-secondary ms-2 text-white">
                                {notification.occurrenceCount}x
                              </span>
                            )}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem" }}
                            dangerouslySetInnerHTML={{
                              __html: String(notification.message),
                            }}
                          ></div>
                          <div
                            className="text-white-50"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {notification.timestamp.toLocaleString()}
                            {notification.autoDismissed && (
                              <span className="ms-2">(auto-resolved)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showDropdown && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: -1 }}
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </li>
  );
});

export { NotificationBadge };
