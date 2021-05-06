import React, { useEffect, useRef, useState, FC } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import addSeconds from "date-fns/addSeconds";
import differenceInSeconds from "date-fns/differenceInSeconds";

import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { TooltipWrapper } from "Components/TooltipWrapper";

const PauseButton: FC<{ alertStore: AlertStore }> = ({ alertStore }) => {
  const context = React.useContext(ThemeContext);
  return (
    <TooltipWrapper title="Click to resume updates">
      <CSSTransition
        in={true}
        appear={true}
        classNames="components-animation-fade"
        timeout={context.animations.duration}
      >
        <FontAwesomeIcon
          className="cursor-pointer text-muted components-fetcher-icon mx-2"
          icon={faPause}
          size="lg"
          onClick={alertStore.status.resume}
        />
      </CSSTransition>
    </TooltipWrapper>
  );
};

const PlayButton: FC<{ alertStore: AlertStore }> = ({ alertStore }) => {
  const context = React.useContext(ThemeContext);
  return (
    <TooltipWrapper title="Click to pause updates">
      <CSSTransition
        in={true}
        appear={true}
        classNames="components-animation-fade"
        timeout={context.animations.duration}
      >
        <FontAwesomeIcon
          className="cursor-pointer text-muted components-fetcher-icon mx-2"
          icon={faPlay}
          size="lg"
          onClick={alertStore.status.pause}
        />
      </CSSTransition>
    </TooltipWrapper>
  );
};

const Dots: FC<{ alertStore: AlertStore; dots: number }> = observer(
  ({ alertStore, dots }) => {
    return (
      <div
        className={`cursor-pointer components-fetcher ${
          alertStore.info.isRetrying ? "retrying" : ""
        } ${
          alertStore.status.value.toString() ===
          AlertStoreStatuses.Processing.toString()
            ? "processing"
            : ""
        } ${
          dots === 0 ||
          alertStore.status.value.toString() ===
            AlertStoreStatuses.Fetching.toString()
            ? "fetching"
            : ""
        }`}
      >
        {Array.from(Array(9).keys()).map((i) => (
          <div
            key={i}
            className={`dot ${i === 4 ? "dot-middle" : ""} ${
              i < dots ? "visible" : "hidden"
            }`}
          ></div>
        ))}
      </div>
    );
  }
);

const Fetcher: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
}> = observer(({ alertStore, settingsStore }) => {
  const timer = useRef<number | undefined>(undefined);
  const [percentLeft, setPercentLeft] = useState<number>(100);
  const [isHover, setIsHover] = useState(false);

  const getSortSettings = () => {
    const sortSettings = {
      useDefaults: false,
      sortOrder: "",
      sortLabel: "",
      sortReverse: "",
    };

    sortSettings.useDefaults =
      settingsStore.gridConfig.config.sortOrder ===
      settingsStore.gridConfig.options.default.value;

    if (sortSettings.useDefaults === true) {
      return sortSettings;
    }

    sortSettings.sortOrder = settingsStore.gridConfig.config.sortOrder;

    // don't sort if sorting is disabled
    if (
      sortSettings.sortOrder === settingsStore.gridConfig.options.disabled.value
    )
      return sortSettings;

    sortSettings.sortReverse =
      settingsStore.gridConfig.config.reverseSort !== null
        ? settingsStore.gridConfig.config.reverseSort === true
          ? "1"
          : "0"
        : "";

    if (settingsStore.gridConfig.config.sortLabel !== null) {
      sortSettings.sortLabel = settingsStore.gridConfig.config.sortLabel;
    }

    return sortSettings;
  };

  const fetchIfIdle = () => {
    const now = new Date();

    const nextTick = addSeconds(
      alertStore.status.lastUpdateAt,
      settingsStore.fetchConfig.config.interval
    );

    const secondsLeft = differenceInSeconds(nextTick, now);

    setPercentLeft(
      Math.max(
        0,
        (secondsLeft / settingsStore.fetchConfig.config.interval) * 100
      )
    );

    const pastDeadline = now >= nextTick;

    const status = alertStore.status.value.toString();
    const updateInProgress =
      status === AlertStoreStatuses.Fetching.toString() ||
      status === AlertStoreStatuses.Processing.toString();

    if (pastDeadline && !updateInProgress && !alertStore.status.paused) {
      callFetch();
    }
  };

  const callFetch = () => {
    if (alertStore.status.paused) return;

    const sortSettings = getSortSettings();
    alertStore.fetchWithThrottle(
      settingsStore.multiGridConfig.config.gridLabel,
      settingsStore.multiGridConfig.config.gridSortReverse,
      sortSettings.sortOrder,
      sortSettings.sortLabel,
      sortSettings.sortReverse
    );
  };

  useEffect(() => {
    return () => window.clearInterval(timer.current);
  }, []);

  useEffect(
    () =>
      reaction(
        () =>
          JSON.stringify({
            filters: alertStore.filters.values
              .map((f: { raw: string }) => f.raw)
              .join(" "),
            grid: {
              sortOrder: settingsStore.gridConfig.config.sortOrder,
              sortLabel: settingsStore.gridConfig.config.sortLabel,
            },
            multigrid: {
              gridLabel: settingsStore.multiGridConfig.config.gridLabel,
              gridSortReverse:
                settingsStore.multiGridConfig.config.gridSortReverse,
              reverseSort: settingsStore.gridConfig.config.reverseSort,
            },
          }),
        () => {
          callFetch();
        },
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    () =>
      reaction(
        () => alertStore.status.paused,
        (paused) => {
          if (paused) {
            window.clearInterval(timer.current);
            timer.current = undefined;
          } else {
            timer.current = window.setInterval(
              () => window.requestAnimationFrame(fetchIfIdle),
              1000
            );
          }
        },
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dots = Math.max(0, Math.min(9, percentLeft / 10));

  return (
    <div
      className="navbar-brand py-0 me-2 d-none d-sm-block"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {alertStore.info.upgradeNeeded ? null : alertStore.status.paused ? (
        <PauseButton alertStore={alertStore} />
      ) : isHover ? (
        <PlayButton alertStore={alertStore} />
      ) : (
        <Dots alertStore={alertStore} dots={dots} />
      )}
    </div>
  );
});

export { Fetcher, Dots, PlayButton, PauseButton };
