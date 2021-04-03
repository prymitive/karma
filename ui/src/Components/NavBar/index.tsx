import React, { FC, useState, useEffect, useCallback, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { useIdleTimer } from "react-idle-timer";

import { CSSTransition } from "react-transition-group";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { IsMobile } from "Common/Device";
import { OverviewModal } from "Components/OverviewModal";
import { MainModal } from "Components/MainModal";
import SilenceModal from "Components/SilenceModal";
import AppToasts from "Components/Toast/AppToasts";
import { ThemeContext } from "Components/Theme";
import { Fetcher } from "Components/Fetcher";
import { FilterInput } from "./FilterInput";
import { MobileIdleTimeout, DesktopIdleTimeout } from "./timeouts";

const NavBar: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  silenceFormStore: SilenceFormStore;
  fixedTop?: boolean;
}> = ({ alertStore, settingsStore, silenceFormStore, fixedTop = true }) => {
  const [containerClass, setContainerClass] = useState<string>("visible");

  const context = React.useContext(ThemeContext);

  const ref = useRef<HTMLElement>();
  const { observe, height } = useDimensions({});

  const updateBodyPaddingTop = useCallback(
    (idle) => {
      const paddingTop = idle ? 0 : height + 8;
      document.body.style.paddingTop = `${paddingTop}px`;
      setContainerClass(idle ? "invisible" : "visible");
    },
    [height]
  );

  const onActive = useCallback(() => {
    alertStore.ui.setIsIdle(false);
  }, [alertStore.ui]);

  const onIdle = useCallback(() => {
    alertStore.ui.setIsIdle(true);
  }, [alertStore.ui]);

  const { pause, reset } = useIdleTimer({
    timeout: IsMobile() ? MobileIdleTimeout : DesktopIdleTimeout,
    onIdle: onIdle,
    onActive: onActive,
    debounce: 500,
  });

  useEffect(() => {
    let timer: number;
    if (alertStore.ui.isIdle) {
      timer = window.setTimeout(
        () => updateBodyPaddingTop(true),
        context.animations.duration
      );
    } else {
      updateBodyPaddingTop(false);
    }
    return () => window.clearTimeout(timer);
  }, [
    height,
    updateBodyPaddingTop,
    alertStore.ui.isIdle,
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
        (paused) => (paused ? pause() : reset()),
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className={`container p-0 m-0 mw-100 ${containerClass}`}>
      <CSSTransition
        classNames="components-animation-navbar"
        in={!alertStore.ui.isIdle}
        timeout={context.animations.duration}
        onEntering={() => {}}
        onExited={() => {}}
        enter
        exit
      >
        <nav
          ref={(el) => {
            observe(el as HTMLElement);
            ref.current = el as HTMLElement;
          }}
          className={`navbar navbar-expand navbar-dark p-1 bg-primary-transparent d-flex ${
            fixedTop ? "fixed-top" : "w-100"
          } align-items-start`}
        >
          <span className="navbar-nav d-flex flex-row">
            <span className="navbar-brand p-0 my-0 mx-2 h1 d-none d-sm-block">
              <OverviewModal alertStore={alertStore} />
            </span>
            <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
          </span>
          <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
          <ul className="navbar-nav flex-wrap flex-shrink-1">
            <AppToasts alertStore={alertStore} />
            <SilenceModal
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              settingsStore={settingsStore}
            />
            <MainModal alertStore={alertStore} settingsStore={settingsStore} />
          </ul>
        </nav>
      </CSSTransition>
    </div>
  );
};

export default observer(NavBar);
