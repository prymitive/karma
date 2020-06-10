import React, { useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { Tab } from "Components/Modal/Tab";
import { Configuration } from "./Configuration";
import { Help } from "./Help";

const TabNames = Object.freeze({
  Configuration: "configuration",
  Help: "help",
});

const MainModalContent = ({
  alertStore,
  settingsStore,
  onHide,
  openTab,
  expandAllOptions,
}) => {
  const [tab, setTab] = useState(openTab);

  return useObserver(() => (
    <React.Fragment>
      <div className="modal-header py-2">
        <nav className="nav nav-pills nav-justified w-100">
          <Tab
            title="Configuration"
            active={tab === TabNames.Configuration}
            onClick={() => setTab(TabNames.Configuration)}
          />
          <Tab
            title="Help"
            active={tab === TabNames.Help}
            onClick={() => setTab(TabNames.Help)}
          />
          <button type="button" className="close" onClick={onHide}>
            <span>&times;</span>
          </button>
        </nav>
      </div>
      <div className="modal-body">
        {tab === TabNames.Help ? (
          <Help defaultIsOpen={expandAllOptions} />
        ) : null}
        {tab === TabNames.Configuration ? (
          <Configuration
            settingsStore={settingsStore}
            defaultIsOpen={expandAllOptions}
          />
        ) : null}
      </div>
      <div className="modal-footer">
        {alertStore.info.authentication.enabled && (
          <span className="text-muted mr-2">
            Username: {alertStore.info.authentication.username}
          </span>
        )}
        <span className="text-muted">Version: {alertStore.info.version}</span>
      </div>
    </React.Fragment>
  ));
};
MainModalContent.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  onHide: PropTypes.func.isRequired,
  openTab: PropTypes.oneOf(Object.values(TabNames)),
  expandAllOptions: PropTypes.bool.isRequired,
};
MainModalContent.defaultProps = {
  openTab: TabNames.Configuration,
};

export { MainModalContent, TabNames };
