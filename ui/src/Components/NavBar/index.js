import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";
import { MainModal } from "Components/MainModal";
import { SilenceModal } from "Components/SilenceModal";

import "./index.css";

const NavbarOnResize = function(width, height) {
  document.body.style["padding-top"] = `${height + 4}px`;
};

const NavBar = observer(
  class NavBar extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    render() {
      const { alertStore, settingsStore, silenceFormStore } = this.props;

      // if we have at least 2 filters then it's likely that filter input will
      // use 2 lines, so set right side icons on small screeens to column mode
      // for more compact layout
      const flexClass =
        alertStore.filters.values.length >= 2
          ? "flex-column flex-sm-column flex-md-row flex-lg-row flex-xl-row"
          : "flex-row";

      return (
        <div className="container">
          <nav className="navbar fixed-top navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block">
            <ReactResizeDetector handleHeight onResize={NavbarOnResize} />
            <span className="navbar-brand my-0 mx-2 h1 d-none d-sm-block float-left">
              {alertStore.info.totalAlerts}
              <FetchIndicator status={alertStore.status.value.toString()} />
            </span>
            <ul className={`navbar-nav float-right d-flex ${flexClass}`}>
              <SilenceModal
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
              />
              <MainModal
                alertStore={alertStore}
                settingsStore={settingsStore}
              />
            </ul>
            <FilterInput
              alertStore={alertStore}
              settingsStore={settingsStore}
            />
          </nav>
        </div>
      );
    }
  }
);

export { NavBar, NavbarOnResize };
