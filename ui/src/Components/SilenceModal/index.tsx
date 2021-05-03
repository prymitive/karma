import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { Modal } from "Components/Modal";
import { TooltipWrapper } from "Components/TooltipWrapper";

// https://github.com/facebook/react/issues/14603
const SilenceModalContent = React.lazy(() =>
  import("./SilenceModalContent").then((module) => ({
    default: module.SilenceModalContent,
  }))
);

const SilenceModal: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, silenceFormStore, settingsStore }) => {
  return (
    <>
      <li
        className={`nav-item components-navbar-button ${
          silenceFormStore.toggle.visible ? "border-info" : ""
        } ml-auto`}
      >
        <TooltipWrapper title="New silence">
          <span
            id="components-new-silence"
            className="nav-link cursor-pointer"
            onClick={silenceFormStore.toggle.toggle}
          >
            <FontAwesomeIcon icon={faBellSlash} fixedWidth />
          </span>
        </TooltipWrapper>
      </li>
      <Modal
        isOpen={silenceFormStore.toggle.visible}
        toggleOpen={silenceFormStore.toggle.toggle}
        onExited={() => {
          silenceFormStore.data.resetProgress();
          silenceFormStore.data.setAutofillMatchers(true);
        }}
      >
        <React.Suspense
          fallback={
            <h1 className="display-1 text-placeholder p-5 m-auto">
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            </h1>
          }
        >
          <SilenceModalContent
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            onHide={silenceFormStore.toggle.hide}
          />
        </React.Suspense>
      </Modal>
    </>
  );
};

export default observer(SilenceModal);
