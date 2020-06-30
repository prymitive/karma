import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faVolumeMute } from "@fortawesome/free-solid-svg-icons/faVolumeMute";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const InhibitedByModalContent = React.lazy(() =>
  import("./InhibitedByModalContent").then((module) => ({
    default: module.InhibitedByModalContent,
  }))
);

const InhibitedByModal = ({ alertStore, fingerprints }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  return (
    <React.Fragment>
      <TooltipWrapper title="This alert is inhibited by other alerts, click to see details">
        <span
          className="badge badge-light components-label components-label-with-hover cursor-pointer"
          onClick={toggle}
        >
          <FontAwesomeIcon className="text-success" icon={faVolumeMute} />
        </span>
      </TooltipWrapper>
      <Modal size="lg" isOpen={isVisible} toggleOpen={toggle}>
        <React.Suspense
          fallback={
            <h1 className="display-1 text-placeholder p-5 m-auto">
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            </h1>
          }
        >
          <InhibitedByModalContent
            alertStore={alertStore}
            onHide={() => setIsVisible(false)}
            isVisible={isVisible}
            fingerprints={fingerprints}
          />
        </React.Suspense>
      </Modal>
    </React.Fragment>
  );
};
InhibitedByModal.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  fingerprints: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export { InhibitedByModal };
