import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, reaction } from "mobx";
import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import IdleTimer from "react-idle-timer";

import { motion } from "framer-motion";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { IsMobile } from "Common/Device";
import { OverviewModal } from "Components/OverviewModal";
import { MainModal } from "Components/MainModal";
import { SilenceModal } from "Components/SilenceModal";
import { ThemeContext } from "Components/Theme";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";

const DesktopIdleTimeout = 1000 * 60 * 3;
const MobileIdleTimeout = 1000 * 12;

const NavBar = observer(
  class NavBar extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      fixedTop: PropTypes.bool,
    };
    static defaultProps = {
      fixedTop: true,
    };

    constructor(props) {
      super(props);

      this.idleTimer = null;
      this.animationTimer = null;

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
          },
        },
        {
          setIdle: action.bound,
          setActive: action.bound,
          hide: action.bound,
          show: action.bound,
        }
      );

      this.activityStatusReaction = reaction(
        () =>
          props.alertStore.status.paused ||
          props.alertStore.filters.values.filter((f) => f.applied === false)
            .length > 0,
        (paused) =>
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
        },
      },
      { setSize: action }
    );

    updateBodyPaddingTop = () => {
      const paddingTop = this.activityStatus.idle
        ? 0
        : this.elementSize.height + 8;
      document.body.style.paddingTop = `${paddingTop}px`;
    };

    onToggle = () => {
      if (this.activityStatus.idle) {
        this.activityStatus.hide();
        this.updateBodyPaddingTop();
      } else {
        this.updateBodyPaddingTop();
        this.activityStatus.show();
      }
    };

    onIdleTimerActive = () => {
      clearTimeout(this.animationTimer);
      this.activityStatus.setActive();
      this.onToggle();
    };

    onIdleTimerIdle = () => {
      const { settingsStore } = this.props;

      if (settingsStore.filterBarConfig.config.autohide) {
        this.activityStatus.setIdle();
        this.animationTimer = setTimeout(this.onToggle, 1000);
      }
    };

    onResize = (width, height) => {
      this.elementSize.setSize(width, height);
      this.updateBodyPaddingTop();
    };

    render() {
      const {
        alertStore,
        settingsStore,
        silenceFormStore,
        fixedTop,
      } = this.props;

      // if we have at least 1 filter then it's likely that filter input will
      // use 2 lines, so set right side icons on small screeens to column mode
      // for more compact layout
      const flexClass =
        alertStore.filters.values.length >= 1
          ? "flex-column flex-sm-row flex-md-row flex-lg-row flex-xl-row"
          : "flex-row";

      const isMobile = IsMobile();

      return (
        <IdleTimer
          ref={(ref) => {
            this.idleTimer = ref;
          }}
          onActive={this.onIdleTimerActive}
          onIdle={this.onIdleTimerIdle}
          timeout={isMobile ? MobileIdleTimeout : DesktopIdleTimeout}
        >
          <div
            className={`container p-0 m-0 mw-100 ${this.activityStatus.className}`}
          >
            <motion.nav
              initial="visible"
              animate={this.activityStatus.idle ? "hidden" : "visible"}
              variants={{
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                hidden: { opacity: 0, y: "-100%", transition: { duration: 1 } },
              }}
              className={`navbar navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block ${
                fixedTop ? "fixed-top" : "w-100"
              }`}
            >
              <ReactResizeDetector handleHeight onResize={this.onResize} />
              <span className="navbar-brand p-0 my-0 mx-2 h1 d-none d-sm-block float-left">
                <OverviewModal alertStore={alertStore} />
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
            </motion.nav>
          </div>
        </IdleTimer>
      );
    }
  }
);
NavBar.contextType = ThemeContext;

export { NavBar, MobileIdleTimeout, DesktopIdleTimeout };
