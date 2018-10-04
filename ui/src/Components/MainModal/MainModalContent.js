import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { Configuration } from "./Configuration";
import { MountModalBackdrop } from "Components/Animations/MountModal";
import { Help } from "./Help";

const Tab = ({ title, active, onClick }) => (
  <span
    className={`nav-item nav-link cursor-pointer ${
      active ? "active" : "text-primary"
    }`}
    onClick={onClick}
  >
    {title}
  </span>
);
Tab.propTypes = {
  title: PropTypes.string.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired
};

const TabNames = Object.freeze({
  Configuration: "configuration",
  Help: "help"
});

const MainModalContent = observer(
  class MainModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      onHide: PropTypes.func.isRequired,
      isVisible: PropTypes.bool.isRequired
    };

    tab = observable(
      {
        current: TabNames.Configuration,
        setTab(newTab) {
          this.current = newTab;
        }
      },
      { setTab: action.bound }
    );

    componentDidMount() {
      disableBodyScroll(document.querySelector(".modal"));
    }

    componentWillUnmount() {
      enableBodyScroll(document.querySelector(".modal"));
    }

    render() {
      const { alertStore, settingsStore, onHide, isVisible } = this.props;

      return ReactDOM.createPortal(
        <React.Fragment>
          <div className="modal d-block" role="dialog">
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
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
                  {this.tab.current === TabNames.Help ? <Help /> : null}
                  {this.tab.current === TabNames.Configuration ? (
                    <Configuration settingsStore={settingsStore} />
                  ) : null}
                </div>
                <div className="modal-footer">
                  <span className="text-muted">
                    Version: {alertStore.info.version}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <MountModalBackdrop in={isVisible} unmountOnExit>
            <div className="modal-backdrop d-block" />
          </MountModalBackdrop>
        </React.Fragment>,
        document.body
      );
    }
  }
);

export { MainModalContent };
