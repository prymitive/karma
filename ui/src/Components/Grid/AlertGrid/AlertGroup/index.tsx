import React, { FC, useEffect, useCallback, useState, ReactNode } from "react";

import { observer } from "mobx-react-lite";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons/faEllipsisH";

import { APIAlertT, APIAlertGroupT, AlertStateT } from "Models/APITypes";
import { Settings } from "Stores/Settings";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
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

const AllAlertsAreUsingSameAlertmanagers = (alerts: APIAlertT[]): boolean => {
  const usedAMs = alerts.map((alert) =>
    alert.alertmanager.map((am) => am.name).sort()
  );
  return usedAMs.every(
    (listOfAMs) => JSON.stringify(listOfAMs) === JSON.stringify(usedAMs[0])
  );
};

const AlertGroup: FC<{
  group: APIAlertGroupT;
  showAlertmanagers: boolean;
  afterUpdate: () => void;
  alertStore: AlertStore;
  settingsStore: Settings;
  silenceFormStore: SilenceFormStore;
  groupWidth: number;
  gridLabelValue: string;
  initialAlertsToRender?: number;
}> = ({
  group,
  showAlertmanagers,
  afterUpdate,
  silenceFormStore,
  alertStore,
  settingsStore,
  groupWidth,
  gridLabelValue,
  initialAlertsToRender,
}) => {
  const defaultRenderCount =
    settingsStore.alertGroupConfig.config.defaultRenderCount;

  const [alertsToRenderInternal, setAlertsToRender] = useState<number | null>(
    initialAlertsToRender || null
  );

  const alertsToRender = alertsToRenderInternal || defaultRenderCount;

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    DefaultDetailsCollapseValue(settingsStore)
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
      totalSize - defaultRenderCount
    );
    return val;
  };

  const loadMore = () => {
    const step = getStepSize(group.alerts.length);
    // show cur+step, but not more that total alert count
    setAlertsToRender(Math.min(alertsToRender + step, group.alerts.length));
  };

  const loadLess = () => {
    const step = getStepSize(group.alerts.length);
    // show cur-step, but not less than 1
    setAlertsToRender(Math.max(alertsToRender - step, 1));
  };

  const onAlertGroupCollapseEvent = useCallback(
    (event) => {
      if (event.detail.gridLabelValue === gridLabelValue) {
        setIsCollapsed(event.detail.value);
      }
    },
    [gridLabelValue]
  );

  useEffect(() => {
    window.addEventListener("alertGroupCollapse", onAlertGroupCollapseEvent);
    return () => {
      window.removeEventListener(
        "alertGroupCollapse",
        onAlertGroupCollapseEvent
      );
    };
  }, [onAlertGroupCollapseEvent]);

  useEffect(() => {
    afterUpdate();
  });

  const footerAlertmanagers: string[] = [];
  let showAlertmanagersInFooter = false;

  // There's no need to render @alertmanager labels if there's only 1
  // alertmanager upstream
  if (showAlertmanagers) {
    // Decide if we show @alertmanager label in footer or for every alert
    // we show it in the footer only if every alert has the same set of
    // alertmanagers (and there's > 1 alert to show, there's no footer for 1)
    showAlertmanagersInFooter =
      group.alerts.length > 1 &&
      AllAlertsAreUsingSameAlertmanagers(group.alerts);
    if (showAlertmanagersInFooter) {
      for (const am of group.alerts[0].alertmanager) {
        if (!footerAlertmanagers.includes(am.cluster)) {
          footerAlertmanagers.push(am.cluster);
        }
      }
    }
  }

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
              <AlertHistory group={group} />
            ) : null}
            <ul className="list-group">
              {group.alerts
                .slice(0, alertStore.ui.isIdle ? 1 : alertsToRender)
                .map((alert) => (
                  <Alert
                    key={alert.id}
                    group={group}
                    alert={alert}
                    showAlertmanagers={
                      showAlertmanagers && !showAlertmanagersInFooter
                    }
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
              {group.alerts.length > defaultRenderCount ? (
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
                        {Math.min(alertsToRender, group.alerts.length)}
                        {" of "}
                        {group.alerts.length}
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
        {isCollapsed === false && group.alerts.length > 1 ? (
          <GroupFooter
            group={group}
            alertmanagers={footerAlertmanagers}
            afterUpdate={afterUpdate}
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            showAnnotations={!alertStore.ui.isIdle}
            showSilences={!alertStore.ui.isIdle}
          />
        ) : null}
      </div>
    </div>
  );
};

export default observer(AlertGroup);
