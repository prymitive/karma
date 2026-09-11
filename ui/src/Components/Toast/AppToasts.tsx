import { FC, Fragment, useCallback, useDeferredValue } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";

import type { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToastContainer, Toast } from ".";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

const AppToasts: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  const show = useCallback(() => {
    const e = new CustomEvent("showNotifications");
    window.dispatchEvent(e);
  }, []);

  // Store changes render urgently, the toast lists are deferred so toast
  // mounts and unmounts render inside a Transition and fade in and out.
  const upstreamsWithErrors = useDeferredValue(
    alertStore.data.upstreamsWithErrors,
  );
  const upgradeReady = useDeferredValue(alertStore.info.upgradeReady);

  if (alertStore.info.upgradeNeeded) {
    return null;
  }

  if (
    alertStore.data.upstreamsWithErrors.length === 0 &&
    alertStore.info.upgradeReady === false
  ) {
    return null;
  }

  return (
    <Fragment>
      <li className="nav-item components-navbar-button ml-auto">
        <TooltipWrapper title="Show all notifications">
          <span
            id="components-notifications"
            className="nav-link cursor-pointer"
            onClick={show}
          >
            <FontAwesomeIcon icon={faInfoCircle} className="fa-fw" />
          </span>
        </TooltipWrapper>
      </li>
      <ToastContainer>
        {upstreamsWithErrors.map((upstream) => (
          <Toast
            key={upstream.name}
            icon={faExclamation}
            iconClass="text-danger"
            message={
              <ToastMessage
                title={`Alertmanager ${upstream.name} raised an error`}
                message={upstream.error}
              />
            }
            hasClose
          />
        ))}
        {upgradeReady ? (
          <Toast
            key="upgrade"
            icon={faArrowUp}
            iconClass="text-success"
            message={<UpgradeToastMessage alertStore={alertStore} />}
            hasClose={false}
          />
        ) : null}
      </ToastContainer>
    </Fragment>
  );
};

export default observer(AppToasts);
