import { FC, Fragment, useCallback } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";

import { AlertStore } from "Stores/AlertStore";
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
            <FontAwesomeIcon icon={faInfoCircle} fixedWidth />
          </span>
        </TooltipWrapper>
      </li>
      <ToastContainer>
        {alertStore.data.upstreamsWithErrors.map((upstream) => (
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
        {alertStore.info.upgradeReady ? (
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
