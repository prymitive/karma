import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import IdleTimer from "react-idle-timer";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { MainModal } from "Components/MainModal";
import { SilenceModal } from "Components/SilenceModal";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";

import "./index.css";

const DesktopIdleTimeout = 1000 * 60 * 3;
const MobileIdleTimeout = 1000 * 5;

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

    activityStatus = observable(
      {
        idle: false,
        setIdle() {
          this.idle = true;
        },
        setActive() {
          this.idle = false;
        }
      },
      {
        setIdle: action.bound,
        setActive: action.bound
      }
    );

    onHide = () => {
      NavbarOnResize(0, 0);
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
        <IdleTimer
          onActive={this.activityStatus.setActive}
          onIdle={this.activityStatus.setIdle}
          timeout={
            window.innerWidth >= 768 ? DesktopIdleTimeout : MobileIdleTimeout
          }
        >
          <DropdownSlide
            in={!this.activityStatus.idle}
            appear={false}
            onExited={this.onHide}
            unmountOnExit
          >
            <div className="container">
              <nav className="navbar fixed-top navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block">
                <ReactResizeDetector handleHeight onResize={NavbarOnResize} />
                <span className="navbar-brand my-0 mx-2 h1 d-none d-sm-block float-left">
                  {alertStore.info.totalAlerts}
                  <FetchIndicator alertStore={alertStore} />
                </span>
                <ul className={`navbar-nav float-right d-flex ${flexClass}`}>
                  <SilenceModal
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    settingsStore={settingsStore}
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
          </DropdownSlide>
        </IdleTimer>
      );
    }
  }
);

export { NavBar, NavbarOnResize };
