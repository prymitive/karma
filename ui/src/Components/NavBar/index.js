import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, reaction } from "mobx";
import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import IdleTimer from "react-idle-timer";

import Flash from "react-reveal/Flash";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { IsMobile } from "Common/Device";
import { NavBarSlide } from "Components/Animations/NavBarSlide";
import { MainModal } from "Components/MainModal";
import { SilenceModal } from "Components/SilenceModal";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";

import "./index.css";

const DesktopIdleTimeout = 1000 * 60 * 3;
const MobileIdleTimeout = 1000 * 12;

const NavBar = observer(
  class NavBar extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    constructor(props) {
      super(props);

      this.idleTimer = null;

      this.activityStatus = observable(
        {
          idle: false,
          className: "visible",
          setIdle() {
            this.idle = true;
          },
          setActive() {
            this.idle = false;
          },
          hide() {
            this.className = "invisible";
          },
          show() {
            this.className = "visible";
          }
        },
        {
          setIdle: action.bound,
          setActive: action.bound,
          hide: action.bound,
          show: action.bound
        }
      );

      this.activityStatusReaction = reaction(
        () => props.alertStore.status.paused,
        paused =>
          paused
            ? this.idleTimer && this.idleTimer.pause()
            : this.idleTimer && this.idleTimer.reset(),
        { fireImmediately: true }
      );
    }

    elementSize = observable(
      {
        width: 0,
        height: 0,
        setSize(width, height) {
          this.width = width;
          this.height = height;
        }
      },
      { setSize: action }
    );

    updateBodyPaddingTop = () => {
      const paddingTop = this.activityStatus.idle
        ? 0
        : this.elementSize.height + 4;
      document.body.style.paddingTop = `${paddingTop}px`;
    };

    onHide = () => {
      this.activityStatus.hide();
      this.updateBodyPaddingTop();
    };

    onShow = () => {
      this.updateBodyPaddingTop();
      this.activityStatus.show();
    };

    onResize = (width, height) => {
      this.elementSize.setSize(width, height);
      this.updateBodyPaddingTop();
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

      const isMobile = IsMobile();

      return (
        <IdleTimer
          ref={ref => {
            this.idleTimer = ref;
          }}
          onActive={this.activityStatus.setActive}
          onIdle={() => {
            if (settingsStore.filterBarConfig.config.autohide) {
              this.activityStatus.setIdle();
            }
          }}
          timeout={isMobile ? MobileIdleTimeout : DesktopIdleTimeout}
        >
          <div className={`container ${this.activityStatus.className}`}>
            <NavBarSlide
              in={!this.activityStatus.idle}
              onEntering={this.onShow}
              onExited={this.onHide}
            >
              <nav className="navbar fixed-top navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block">
                <ReactResizeDetector handleHeight onResize={this.onResize} />
                <span className="navbar-brand my-0 mx-2 h1 d-none d-sm-block float-left">
                  <Flash spy={alertStore.info.totalAlerts}>
                    <div className="d-inline-block">
                      {alertStore.info.totalAlerts}
                    </div>
                  </Flash>
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
            </NavBarSlide>
          </div>
        </IdleTimer>
      );
    }
  }
);

export { NavBar };
