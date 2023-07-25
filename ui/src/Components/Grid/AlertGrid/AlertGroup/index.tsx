import React, { FC, useEffect, useCallback, useState, ReactNode } from "react";

import { observer } from "mobx-react-lite";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons/faEllipsisH";

import type { APIGridT, APIAlertGroupT, AlertStateT } from "Models/APITypes";
import type { Settings } from "Stores/Settings";
import type { AlertStore } from "Stores/AlertStore";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import { BackgroundClassMap } from "Common/Colors";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ThemeContext } from "Components/Theme";
import { AlertHistory } from "Components/AlertHistory";
import GroupHeader from "./GroupHeader";
import Alert from "./Alert";
import GroupFooter from "./GroupFooter";
import { DefaultDetailsCollapseValue } from "./DetailsToggle";

const LoadButton: FC<{
  icon: IconDefinition;
  action: () => void;
  tooltip: ReactNode;
}> = ({ icon, action, tooltip }) => {
  return (
    <TooltipWrapper title={tooltip}>
      <button
        type="button"
        className="btn btn-sm py-0 with-click"
        onClick={action}
      >
        <FontAwesomeIcon className="text-muted" icon={icon} />
      </button>
    </TooltipWrapper>
  );
};

const AlertGroup: FC<{
  grid: APIGridT;
  group: APIAlertGroupT;
  afterUpdate: () => void;
  alertStore: AlertStore;
  settingsStore: Settings;
  silenceFormStore: SilenceFormStore;
  groupWidth: number;
  gridLabelValue: string;
}> = ({
  grid,
  group,
  afterUpdate,
  silenceFormStore,
  alertStore,
  settingsStore,
  groupWidth,
  gridLabelValue,
}) => {
  const defaultRenderCount =
    settingsStore.alertGroupConfig.config.defaultRenderCount;

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    DefaultDetailsCollapseValue(settingsStore),
  );

  // Used to calculate step size when loading more alerts.
  // Step is calculated from the excesive alert count
  // (what's > defaultRenderCount) by dividing it into 5 clicks.
  // Don't use step lower than 5, too much clicking if we have a group of 9:
  // * we'll show initially 5
  // * step would be 1
  // * 4 extra clicks to see the entire group
  // but ensure that step wouldn't push us above totalSize
  // With 9 alerts and rendering 5 initially we want to show extra 9 after one
  // click, and when user clicks showLess we want to go back to 5.
  const getStepSize = (totalSize: number) => {
    const val = Math.min(
      Math.max(Math.round((totalSize - defaultRenderCount) / 5), 5),
      totalSize - defaultRenderCount,
    );
    return val;
  };

  const loadMore = () => {
    const step = getStepSize(group.totalAlerts);
    alertStore.ui.setGroupAlertLimit(
      group.id,
      Math.min(group.alerts.length + step, group.totalAlerts),
    );
  };

  const loadLess = () => {
    const step = getStepSize(group.totalAlerts);
    alertStore.ui.setGroupAlertLimit(
      group.id,
      Math.max(group.alerts.length - step, 1),
    );
  };

  const onAlertGroupCollapseEvent = useCallback(
    (event) => {
      if (event.detail.gridLabelValue === gridLabelValue) {
        setIsCollapsed(event.detail.value);
      }
    },
    [gridLabelValue],
  );

  useEffect(() => {
    window.addEventListener("alertGroupCollapse", onAlertGroupCollapseEvent);
    return () => {
      window.removeEventListener(
        "alertGroupCollapse",
        onAlertGroupCollapseEvent,
      );
    };
  }, [onAlertGroupCollapseEvent]);

  useEffect(() => {
    afterUpdate();
  });

  let themedCounters = true;
  let cardBackgroundClass = "bg-light";
  if (settingsStore.alertGroupConfig.config.colorTitleBar) {
    const stateList = Object.entries(group.stateCount)
      .filter(([_, v]) => v !== 0)
      .map(([k, _]) => k);
    if (stateList.length === 1) {
      const state = stateList.pop();
      cardBackgroundClass = BackgroundClassMap[state as AlertStateT];
      themedCounters = false;
    }
  }

  const context = React.useContext(ThemeContext);

  return (
    <div
      className={`components-grid-alertgrid-alertgroup ${
        context.animations.duration ? "animate" : ""
      }`}
      style={{
        width: groupWidth,
        zIndex: isMenuOpen ? 100 : undefined,
      }}
      data-defaultrendercount={
        settingsStore.alertGroupConfig.config.defaultRenderCount
      }
    >
      <div
        className={`card ${cardBackgroundClass}`}
        data-colortitlebar={settingsStore.alertGroupConfig.config.colorTitleBar}
      >
        <GroupHeader
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          grid={grid}
          group={group}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          themedCounters={themedCounters}
          setIsMenuOpen={setIsMenuOpen}
          gridLabelValue={gridLabelValue}
        />
        {isCollapsed ? null : (
          <div className="card-body px-2 py-1 components-grid-alertgrid-card">
            {alertStore.settings.values.historyEnabled ? (
              <AlertHistory group={group} grid={grid} />
            ) : null}
            <ul className="list-group">
              {group.alerts
                .slice(0, alertStore.ui.isIdle ? 1 : group.alerts.length)
                .map((alert) => (
                  <Alert
                    key={alert.id}
                    grid={grid}
                    group={group}
                    alert={alert}
                    showReceiver={
                      alertStore.data.receivers.length > 1 &&
                      group.alerts.length === 1
                    }
                    showOnlyExpandedAnnotations={alertStore.ui.isIdle}
                    afterUpdate={afterUpdate}
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                ))}
              {group.totalAlerts > defaultRenderCount ? (
                <li
                  className="list-group-item border-0 p-0 text-center bg-transparent"
                  style={{
                    lineHeight: alertStore.ui.isIdle ? "1rem" : undefined,
                  }}
                >
                  {alertStore.ui.isIdle ? (
                    <FontAwesomeIcon
                      icon={faEllipsisH}
                      className="text-muted"
                    />
                  ) : (
                    <>
                      <LoadButton
                        icon={faMinus}
                        action={loadLess}
                        tooltip="Show fewer alerts in this group"
                      />
                      <small className="text-muted mx-2">
                        {group.alerts.length}
                        {" of "}
                        {group.totalAlerts}
                      </small>
                      <LoadButton
                        icon={faPlus}
                        action={loadMore}
                        tooltip="Show more alerts in this group"
                      />
                    </>
                  )}
                </li>
              ) : null}
            </ul>
          </div>
        )}
        {isCollapsed === false ? (
          <GroupFooter
            group={group}
            afterUpdate={afterUpdate}
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            showAnnotations={!alertStore.ui.isIdle}
            showSilences={!alertStore.ui.isIdle}
            showReceiver={
              !(
                alertStore.data.receivers.length > 1 &&
                group.alerts.length === 1
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
};

export default observer(AlertGroup);
