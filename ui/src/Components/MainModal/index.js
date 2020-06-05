import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
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

const MainModal = ({ alertStore, settingsStore }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  return (
    <React.Fragment>
      <li
        className={`nav-item components-navbar-button ${
          isVisible ? "border-info" : ""
        }`}
      >
        <TooltipWrapper title="Settings">
          <span
            id="components-settings"
            className="nav-link cursor-pointer"
            onClick={toggle}
          >
            <FontAwesomeIcon icon={faCog} />
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
            isVisible={isVisible}
            expandAllOptions={false}
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  );
};
MainModal.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { MainModal };
