import React, { FC, useState, useCallback } from "react";

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

const InhibitedByModal: FC<{
  alertStore: AlertStore;
  fingerprints: string[];
}> = ({ alertStore, fingerprints }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  return (
    <>
      <TooltipWrapper title="This alert is inhibited by other alerts, click to see details">
        <span
          className="badge bg-light components-label components-label-with-hover cursor-pointer"
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
            fingerprints={fingerprints}
          />
        </React.Suspense>
      </Modal>
    </>
  );
};

export { InhibitedByModal };
