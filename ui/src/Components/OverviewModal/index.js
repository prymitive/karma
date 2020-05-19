import React from "react";
import PropTypes from "prop-types";

import { observer, useLocalStore } from "mobx-react";

import { motion } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { useFlashAnimation } from "Hooks/useFlashAnimation";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const OverviewModalContent = React.lazy(() =>
  import("./OverviewModalContent").then((module) => ({
    default: module.OverviewModalContent,
  }))
);

const OverviewModal = observer(({ alertStore }) => {
  const toggle = useLocalStore(() => ({
    show: false,
    toggle() {
      this.show = !this.show;
    },
    hide() {
      this.show = false;
    },
  }));

  const [ref, animate] = useFlashAnimation(alertStore.info.totalAlerts);

  return (
    <React.Fragment>
      <TooltipWrapper title="Show alert overview">
        <motion.div
          ref={ref}
          animate={animate}
          className={`text-center d-inline-block cursor-pointer navbar-brand m-0 components-navbar-button  ${
            toggle.show ? "border-info" : ""
          }`}
          onClick={toggle.toggle}
        >
          {alertStore.info.totalAlerts}
        </motion.div>
      </TooltipWrapper>
      <Modal size="xl" isOpen={toggle.show} toggleOpen={toggle.toggle}>
        <React.Suspense
          fallback={
            <h1 className="display-1 text-placeholder p-5 m-auto">
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            </h1>
          }
        >
          <OverviewModalContent
            alertStore={alertStore}
            onHide={toggle.hide}
            isVisible={toggle.show}
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  );
});
OverviewModal.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { OverviewModal };
