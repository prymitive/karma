import { FC, useState } from "react";

import { Observer } from "mobx-react-lite";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { Tab } from "Components/Modal/Tab";
import { Configuration } from "./Configuration";
import { Help } from "./Help";

export type OpenTabT = "configuration" | "help";

const MainModalContent: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  onHide: () => void;
  openTab?: OpenTabT;
  expandAllOptions: boolean;
}> = ({
  alertStore,
  settingsStore,
  onHide,
  openTab = "configuration",
  expandAllOptions,
}) => {
  const [tab, setTab] = useState<OpenTabT>(openTab);

  return (
    <>
      <div className="modal-header py-2">
        <nav className="nav nav-pills nav-justified w-100">
          <Tab
            title="Configuration"
            active={tab === "configuration"}
            onClick={() => setTab("configuration")}
          />
          <Tab
            title="Help"
            active={tab === "help"}
            onClick={() => setTab("help")}
          />
          <button
            type="button"
            className="btn-close my-auto"
            onClick={onHide}
          ></button>
        </nav>
      </div>
      <div className="modal-body">
        {tab === "help" ? <Help defaultIsOpen={expandAllOptions} /> : null}
        {tab === "configuration" ? (
          <Configuration
            settingsStore={settingsStore}
            defaultIsOpen={expandAllOptions}
          />
        ) : null}
      </div>
      <div className="modal-footer">
        <Observer>
          {() =>
            alertStore.info.authentication.enabled ? (
              <span className="text-muted me-2">
                Username: {alertStore.info.authentication.username}
              </span>
            ) : null
          }
        </Observer>
        <Observer>
          {() => (
            <span className="text-muted">
              Version: {alertStore.info.version}
            </span>
          )}
        </Observer>
      </div>
    </>
  );
};

export { MainModalContent };
