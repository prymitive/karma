import { FC } from "react";

import { Observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { Tab } from "Components/Modal/Tab";
import SilenceForm from "./SilenceForm";
import { SilencePreview } from "./SilencePreview";
import SilenceSubmitController from "./SilenceSubmit/SilenceSubmitController";
import Browser from "./Browser";

const ReadOnlyPlaceholder: FC = () => (
  <div className="px-2 py-5 bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faLock} className="me-3" />
      Read only mode
    </h1>
  </div>
);

const SilenceModalContent: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
  onHide: () => void;
  previewOpen?: boolean;
}> = ({
  alertStore,
  silenceFormStore,
  settingsStore,
  onHide,
  previewOpen = false,
}) => {
  return (
    <Observer>
      {() => (
        <>
          <div className="modal-header py-2">
            <nav className="nav nav-pills nav-justified w-100">
              <Tab
                title={
                  silenceFormStore.data.currentStage === "form"
                    ? silenceFormStore.data.silenceID === null
                      ? "New silence"
                      : "Editing silence"
                    : silenceFormStore.data.currentStage === "preview"
                    ? "Preview silenced alerts"
                    : "Silence submitted"
                }
                active={silenceFormStore.tab.current === "editor"}
                onClick={() => silenceFormStore.tab.setTab("editor")}
              />
              <Tab
                title="Browse"
                active={silenceFormStore.tab.current === "browser"}
                onClick={() => silenceFormStore.tab.setTab("browser")}
              />
              <button
                type="button"
                className="btn-close my-auto"
                onClick={onHide}
              ></button>
            </nav>
          </div>
          <div
            className={`modal-body ${
              silenceFormStore.toggle.blurred ? "modal-content-blur" : ""
            }`}
          >
            {silenceFormStore.tab.current === "editor" ? (
              silenceFormStore.data.currentStage === "form" ? (
                alertStore.data.upstreams.instances.length > 0 ? (
                  Object.keys(alertStore.data.clustersWithoutReadOnly).length >
                  0 ? (
                    <SilenceForm
                      alertStore={alertStore}
                      silenceFormStore={silenceFormStore}
                      settingsStore={settingsStore}
                      previewOpen={previewOpen}
                    />
                  ) : (
                    <ReadOnlyPlaceholder />
                  )
                ) : (
                  <h1 className="text-center display-1 text-placeholder p-5 m-auto">
                    <FontAwesomeIcon icon={faSpinner} size="lg" spin />
                  </h1>
                )
              ) : silenceFormStore.data.currentStage === "preview" ? (
                <SilencePreview
                  alertStore={alertStore}
                  silenceFormStore={silenceFormStore}
                />
              ) : (
                <SilenceSubmitController
                  alertStore={alertStore}
                  silenceFormStore={silenceFormStore}
                />
              )
            ) : null}
            {silenceFormStore.tab.current === "browser" ? (
              <Browser
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                settingsStore={settingsStore}
              />
            ) : null}
          </div>
        </>
      )}
    </Observer>
  );
};

export { SilenceModalContent };
