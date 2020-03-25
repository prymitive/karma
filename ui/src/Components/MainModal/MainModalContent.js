import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { Tab } from "Components/Modal/Tab";
import { Configuration } from "./Configuration";
import { Help } from "./Help";

const TabNames = Object.freeze({
  Configuration: "configuration",
  Help: "help",
});

const MainModalContent = observer(
  class MainModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      onHide: PropTypes.func.isRequired,
      openTab: PropTypes.oneOf(Object.values(TabNames)),
      expandAllOptions: PropTypes.bool.isRequired,
    };
    static defaultProps = {
      openTab: TabNames.Configuration,
    };

    constructor(props) {
      super(props);

      this.tab = observable(
        {
          current: props.openTab,
          setTab(newTab) {
            this.current = newTab;
          },
        },
        { setTab: action.bound }
      );
    }

    render() {
      const {
        alertStore,
        settingsStore,
        onHide,
        expandAllOptions,
      } = this.props;

      return (
        <React.Fragment>
          <div className="modal-header py-2">
            <nav className="nav nav-pills nav-justified w-100">
              <Tab
                title="Configuration"
                active={this.tab.current === TabNames.Configuration}
                onClick={() => this.tab.setTab(TabNames.Configuration)}
              />
              <Tab
                title="Help"
                active={this.tab.current === TabNames.Help}
                onClick={() => this.tab.setTab(TabNames.Help)}
              />
              <button type="button" className="close" onClick={onHide}>
                <span>&times;</span>
              </button>
            </nav>
          </div>
          <div className="modal-body">
            {this.tab.current === TabNames.Help ? (
              <Help defaultIsOpen={expandAllOptions} />
            ) : null}
            {this.tab.current === TabNames.Configuration ? (
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
            <span className="text-muted">
              Version: {alertStore.info.version}
            </span>
          </div>
        </React.Fragment>
      );
    }
  }
);

export { MainModalContent, TabNames };
