import React, { FC, useState, useCallback } from "react";

import { useObserver } from "mobx-react-lite";

import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { useFlashTransition } from "Hooks/useFlashTransition";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const OverviewModalContent = React.lazy(() =>
  import("./OverviewModalContent").then((module) => ({
    default: module.OverviewModalContent,
  }))
);

const OverviewModal: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  const { ref, props } = useFlashTransition(alertStore.info.totalAlerts);

  return useObserver(() => (
    <React.Fragment>
      <TooltipWrapper title="Show alert overview">
        <CSSTransition {...props}>
          <div
            ref={ref}
            className={`text-center d-inline-block cursor-pointer navbar-brand m-0 components-navbar-button  ${
              isVisible ? "border-info" : ""
            }`}
            onClick={toggle}
          >
            {alertStore.info.totalAlerts}
          </div>
        </CSSTransition>
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
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  ));
};

export { OverviewModal };
