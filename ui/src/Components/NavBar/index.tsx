import { use, FC, useState, useEffect, useCallback } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { useIdleTimer } from "react-idle-timer";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
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

  const context = use(ThemeContext);

  const { observe, height } = useDimensions({});

  const updateBodyPaddingTop = useCallback(
    (idle: boolean) => {
      const paddingTop = idle ? 0 : height + 8;
      // eslint-disable-next-line react-compiler/react-compiler -- intentional DOM side-effect, not React state
      document.body.style.paddingTop = `${paddingTop}px`;
      setContainerClass(idle ? "invisible" : "visible");

      const toggleEvent = new CustomEvent("navbarResize", {
        detail: paddingTop,
      });
      window.dispatchEvent(toggleEvent);
    },
    [height],
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
        context.animations.duration,
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
        { fireImmediately: true },
      ),
    [],
  );

  return (
    <div className={`container p-0 m-0 mw-100 ${containerClass}`}>
      <nav
        ref={(el) => {
          observe(el as HTMLElement);
        }}
        className={`navbar navbar-expand navbar-dark p-1 bg-primary-transparent d-flex ${
          fixedTop ? "fixed-top" : "w-100"
        } align-items-start ${
          context.animations.duration ? "components-navbar-animated" : ""
        } ${alertStore.ui.isIdle ? "components-navbar-idle" : ""}`}
      >
        <span className="navbar-nav d-flex flex-row">
          {alertStore.info.timestamp !== "" &&
          alertStore.data.upstreams.instances.length === 0 ? null : (
            <span className="navbar-brand p-0 my-0 mx-2 h1 d-none d-sm-block">
              <OverviewModal alertStore={alertStore} />
            </span>
          )}
          <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
        </span>
        {alertStore.info.timestamp !== "" &&
        alertStore.data.upstreams.instances.length === 0 ? null : (
          <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
        )}
        {alertStore.info.timestamp !== "" &&
        alertStore.data.upstreams.instances.length === 0 ? null : (
          <ul className="navbar-nav flex-wrap flex-shrink-1 ms-1">
            <AppToasts alertStore={alertStore} />
            <SilenceModal
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              settingsStore={settingsStore}
            />
            <MainModal alertStore={alertStore} settingsStore={settingsStore} />
          </ul>
        )}
      </nav>
    </div>
  );
};

export default observer(NavBar);
