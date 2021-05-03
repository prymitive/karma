import React, { FC, useState, useCallback } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH } from "@fortawesome/free-solid-svg-icons/faSlidersH";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const MainModalContent = React.lazy(() =>
  import("./MainModalContent").then((module) => ({
    default: module.MainModalContent,
  }))
);

const MainModal: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
}> = ({ alertStore, settingsStore }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  return (
    <>
      <li
        className={`nav-item components-navbar-button ${
          isVisible ? "border-info" : ""
        } ml-auto`}
      >
        <TooltipWrapper title="Settings">
          <span
            id="components-settings"
            className="nav-link cursor-pointer"
            onClick={toggle}
          >
            <FontAwesomeIcon icon={faSlidersH} fixedWidth />
          </span>
        </TooltipWrapper>
      </li>
      <Modal isOpen={isVisible} toggleOpen={toggle}>
        <React.Suspense
          fallback={
            <h1 className="display-1 text-placeholder p-5 m-auto">
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            </h1>
          }
        >
          <MainModalContent
            alertStore={alertStore}
            settingsStore={settingsStore}
            onHide={() => setIsVisible(false)}
            expandAllOptions={false}
          />
        </React.Suspense>
      </Modal>
    </>
  );
};

export { MainModal };
