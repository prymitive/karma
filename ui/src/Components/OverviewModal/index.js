import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import Flash from "react-reveal/Flash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const OverviewModalContent = React.lazy(() =>
  import("./OverviewModalContent").then((module) => ({
    default: module.OverviewModalContent,
  }))
);

const OverviewModal = ({ alertStore }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  return useObserver(() => (
    <React.Fragment>
      <TooltipWrapper title="Show alert overview">
        <Flash spy={alertStore.info.totalAlerts}>
          <div
            className={`text-center d-inline-block cursor-pointer navbar-brand m-0 components-navbar-button  ${
              isVisible ? "border-info" : ""
            }`}
            onClick={toggle}
          >
            {alertStore.info.totalAlerts}
          </div>
        </Flash>
      </TooltipWrapper>
      <Modal size="xl" isOpen={isVisible} toggleOpen={toggle}>
        <React.Suspense
          fallback={
            <h1 className="display-1 text-placeholder p-5 m-auto">
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            </h1>
          }
        >
          <OverviewModalContent
            alertStore={alertStore}
            onHide={() => setIsVisible(false)}
            isVisible={isVisible}
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  ));
};
OverviewModal.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { OverviewModal };
