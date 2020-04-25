import React from "react";
import PropTypes from "prop-types";

import { observer, useLocalStore } from "mobx-react";

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

const MainModal = observer(({ alertStore, settingsStore }) => {
  const toggle = useLocalStore(() => ({
    show: false,
    toggle() {
      this.show = !this.show;
    },
    hide() {
      this.show = false;
    },
  }));

  return (
    <React.Fragment>
      <li
        className={`nav-item components-navbar-button ${
          toggle.show ? "border-info" : ""
        }`}
      >
        <TooltipWrapper title="Settings">
          <span className="nav-link cursor-pointer" onClick={toggle.toggle}>
            <FontAwesomeIcon icon={faCog} />
          </span>
        </TooltipWrapper>
      </li>
      <Modal isOpen={toggle.show} toggleOpen={toggle.toggle}>
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
            onHide={toggle.hide}
            isVisible={toggle.show}
            expandAllOptions={false}
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  );
});
MainModal.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { MainModal };
