import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

import { reaction } from "mobx";

import addSeconds from "date-fns/addSeconds";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

const Fetcher = ({ alertStore, settingsStore }) => {
  const timer = useRef(null);

  const getSortSettings = () => {
    let sortSettings = {
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
    const nextTick = addSeconds(
      alertStore.status.lastUpdateAt,
      settingsStore.fetchConfig.config.interval
    );

    const pastDeadline = new Date() >= nextTick;

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
    return () => clearInterval(timer.current);
  }, []);

  useEffect(
    () =>
      reaction(
        () =>
          JSON.stringify({
            filters: alertStore.filters.values.map((f) => f.raw).join(" "),
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
            clearInterval(timer.current);
            timer.current = null;
          } else {
            timer.current = setInterval(
              () => window.requestAnimationFrame(fetchIfIdle),
              1000
            );
          }
        },
        { fireImmediately: true }
      ),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <span />;
};
Fetcher.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { Fetcher };
