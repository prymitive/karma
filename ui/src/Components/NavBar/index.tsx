import React, { FC, useState, useEffect, useCallback } from "react";

import { reaction } from "mobx";
import { useObserver } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { useIdleTimer } from "react-idle-timer";

import { CSSTransition } from "react-transition-group";

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

const NavBar: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  silenceFormStore: SilenceFormStore;
  fixedTop?: boolean;
}> = ({ alertStore, settingsStore, silenceFormStore, fixedTop = true }) => {
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [containerClass, setContainerClass] = useState<string>("visible");

  const context = React.useContext(ThemeContext);

  const { ref, height } = useDimensions({});

  const updateBodyPaddingTop = useCallback(
    (idle) => {
      const paddingTop = idle ? 0 : height + 8;
      document.body.style.paddingTop = `${paddingTop}px`;
      setContainerClass(idle ? "invisible" : "visible");
    },
    [height]
  );

  const onActive = useCallback(() => {
    setIsIdle(false);
  }, []);

  const onIdle = useCallback(() => {
    setIsIdle(true);
  }, []);

  const { pause, reset } = useIdleTimer({
    timeout: IsMobile() ? MobileIdleTimeout : DesktopIdleTimeout,
    onIdle: onIdle,
    onActive: onActive,
    debounce: 500,
  });

  useEffect(() => {
    let timer: number;
    if (isIdle) {
      timer = window.setTimeout(
        () => updateBodyPaddingTop(true),
        context.animations.duration
      );
    } else {
      updateBodyPaddingTop(false);
    }
    return () => window.clearTimeout(timer);
  }, [height, updateBodyPaddingTop, isIdle, context.animations.duration]);

  useEffect(
    () =>
      reaction(
        () =>
          !settingsStore.filterBarConfig.config.autohide ||
          alertStore.status.paused ||
          alertStore.filters.values.filter((f) => f.applied === false).length >
            0,
        (paused) => (paused ? pause() : reset()),
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return useObserver(() => (
    <div className={`container p-0 m-0 mw-100 ${containerClass}`}>
      <CSSTransition
        classNames="components-animation-navbar"
        in={!isIdle}
        timeout={context.animations.duration}
        onEntering={() => {}}
        onExited={() => {}}
        enter
        exit
      >
        <nav
          ref={ref}
          className={`navbar navbar-expand navbar-dark p-1 bg-primary-transparent d-inline-block ${
            fixedTop ? "fixed-top" : "w-100"
          }`}
        >
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
            <MainModal alertStore={alertStore} settingsStore={settingsStore} />
          </ul>
          <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
        </nav>
      </CSSTransition>
    </div>
  ));
};

export { NavBar, MobileIdleTimeout, DesktopIdleTimeout };
