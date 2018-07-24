import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { Configuration } from "./Configuration";
import { Help } from "./Help";

import "./index.css";

const Tab = ({ title, active, onClick }) => (
  <a
    className={`nav-item nav-link cursor-pointer ${active ? "active" : ""}`}
    onClick={onClick}
  >
    {title}
  </a>
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

const MainModal = observer(
  class MainModal extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    toggle = observable(
      {
        show: false,
        toggle() {
          this.show = !this.show;
        },
        hide() {
          this.show = false;
        }
      },
      { toggle: action.bound, hide: action.bound }
    );

    tab = observable(
      {
        current: TabNames.Configuration,
        setTab(newTab) {
          this.current = newTab;
        }
      },
      { setTab: action.bound }
    );

    componentDidUpdate() {
      document.body.classList.toggle("modal-open", this.toggle.show);
    }

    componentWillUnmount() {
      document.body.classList.remove("modal-open");
    }

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        <React.Fragment>
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className="nav-link mx-1 cursor-pointer"
                data-toggle="dropdown"
                onClick={this.toggle.toggle}
              >
                <FontAwesomeIcon icon={faCog} />
              </a>
            </li>
          </ul>
          {this.toggle.show ? (
            <div
              className="modal d-block bg-primary-transparent-80"
              role="dialog"
            >
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
                    </nav>
                    <button
                      type="button"
                      className="close"
                      onClick={this.toggle.hide}
                    >
                      <span>&times;</span>
                    </button>
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
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { MainModal };
