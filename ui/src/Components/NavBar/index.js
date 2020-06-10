import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { reaction } from "mobx";
import { useObserver } from "mobx-react-lite";

import ReactResizeDetector from "react-resize-detector";

import IdleTimer from "react-idle-timer";

import { Fade } from "react-reveal";

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

const NavBar = ({ alertStore, settingsStore, silenceFormStore, fixedTop }) => {
  const idleTimer = useRef(null);
  const [isIdle, setIsIdle] = useState(false);
  const [containerClass, setContainerClass] = useState("visible");
  const [elementSize, setElementSize] = useState({ width: 0, height: 0 });

  const context = React.useContext(ThemeContext);

  const updateBodyPaddingTop = useCallback(
    (idle) => {
      const paddingTop = idle ? 0 : elementSize.height + 8;
      document.body.style.paddingTop = `${paddingTop}px`;
      setContainerClass(idle ? "invisible" : "visible");
    },
    [elementSize.height]
  );

  const onResize = useCallback((width, height) => {
    setElementSize({ width: width, height: height });
  }, []);

  const onActive = useCallback(() => {
    setIsIdle(false);
  }, []);

  const onIdle = useCallback(() => {
    setIsIdle(true);
  }, []);

  useEffect(() => {
    let timer;
    if (isIdle) {
      timer = setTimeout(
        () => updateBodyPaddingTop(true),
        context.animations.duration
      );
    } else {
      updateBodyPaddingTop(false);
    }
    return () => clearTimeout(timer);
  }, [
    elementSize.height,
    updateBodyPaddingTop,
    isIdle,
    context.animations.duration,
  ]);

  useEffect(
    () =>
      reaction(
        () =>
          !settingsStore.filterBarConfig.config.autohide ||
          alertStore.status.paused ||
          alertStore.filters.values.filter((f) => f.applied === false).length >
            0,
        (paused) =>
          paused
            ? idleTimer.current && idleTimer.current.pause()
            : idleTimer.current && idleTimer.current.reset(),
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return useObserver(() => (
    <IdleTimer
      ref={idleTimer}
      onActive={onActive}
      onIdle={onIdle}
      timeout={IsMobile() ? MobileIdleTimeout : DesktopIdleTimeout}
    >
      <div className={`container p-0 m-0 mw-100 ${containerClass}`}>
        <Fade top when={!isIdle}>
          <nav
            className={`navbar navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block ${
              fixedTop ? "fixed-top" : "w-100"
            }`}
          >
            <ReactResizeDetector handleHeight onResize={onResize} />
            <span className="navbar-brand p-0 my-0 mx-2 h1 d-none d-sm-block float-left">
              <OverviewModal alertStore={alertStore} />
              <FetchIndicator alertStore={alertStore} />
            </span>
            <ul
              className={`navbar-nav float-right d-flex ${
                alertStore.filters.values.length >= 1
                  ? "flex-column flex-sm-row flex-md-row flex-lg-row flex-xl-row"
                  : "flex-row"
              }`}
            >
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
        </Fade>
      </div>
    </IdleTimer>
  ));
};
NavBar.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  fixedTop: PropTypes.bool,
};
NavBar.defaultProps = {
  fixedTop: true,
};

export { NavBar, MobileIdleTimeout, DesktopIdleTimeout };
