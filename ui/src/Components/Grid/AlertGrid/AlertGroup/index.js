import React, { useEffect, useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { Fade } from "react-reveal";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";

import { APIGroup } from "Models/API";
import { Settings } from "Stores/Settings";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BackgroundClassMap } from "Common/Colors";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ThemeContext } from "Components/Theme";
import { GroupHeader } from "./GroupHeader";
import { Alert } from "./Alert";
import { GroupFooter } from "./GroupFooter";
import { DefaultDetailsCollapseValue } from "./DetailsToggle";

const LoadButton = ({ icon, action, tooltip }) => {
  return (
    <TooltipWrapper title={tooltip}>
      <button type="button" className="btn btn-sm py-0" onClick={action}>
        <FontAwesomeIcon className="text-muted" icon={icon} />
      </button>
    </TooltipWrapper>
  );
};
LoadButton.propTypes = {
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  action: PropTypes.func.isRequired,
  tooltip: PropTypes.node.isRequired,
};

const AllAlertsAreUsingSameAlertmanagers = (alerts) => {
  const usedAMs = alerts.map((alert) =>
    alert.alertmanager.map((am) => am.name).sort()
  );
  return usedAMs.every(
    (listOfAMs) => JSON.stringify(listOfAMs) === JSON.stringify(usedAMs[0])
  );
};

const AlertGroup = ({
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

  const [alertsToRenderInternal, setAlertsToRender] = useState(
    initialAlertsToRender || null
  );

  const alertsToRender = alertsToRenderInternal || defaultRenderCount;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(
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
  const getStepSize = (totalSize) => {
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

  let footerAlertmanagers = [];
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
      .filter(([k, v]) => v !== 0)
      .map(([k, _]) => k);
    if (stateList.length === 1) {
      const state = stateList.pop();
      cardBackgroundClass = BackgroundClassMap[state];
      themedCounters = false;
    }
  }

  const context = React.useContext(ThemeContext);

  const mountRef = useRef(null);

  const [fadeDone, setFadeDone] = useState(false);

  return useObserver(() => (
    <div
      ref={mountRef}
      className={`components-grid-alertgrid-alertgroup ${
        mountRef.current && fadeDone
          ? "components-animation-fade-appear-done"
          : ""
      }`}
      style={{
        width: groupWidth,
        zIndex: isMenuOpen ? 100 : null,
      }}
      data-defaultrendercount={
        settingsStore.alertGroupConfig.config.defaultRenderCount
      }
    >
      <Fade
        in={context.animations.in}
        duration={context.animations.duration}
        wait={context.animations.duration}
        onReveal={() => setFadeDone(true)}
      >
        <div
          className={`card ${cardBackgroundClass}`}
          data-colortitlebar={
            settingsStore.alertGroupConfig.config.colorTitleBar
          }
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
              <ul className="list-group">
                {group.alerts.slice(0, alertsToRender).map((alert) => (
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
                    afterUpdate={afterUpdate}
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                ))}
                {group.alerts.length > defaultRenderCount ? (
                  <li className="list-group-item border-0 p-0 text-center bg-transparent">
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
            />
          ) : null}
        </div>
      </Fade>
    </div>
  ));
};
AlertGroup.propTypes = {
  afterUpdate: PropTypes.func.isRequired,
  group: APIGroup.isRequired,
  showAlertmanagers: PropTypes.bool.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  groupWidth: PropTypes.number.isRequired,
  gridLabelValue: PropTypes.string.isRequired,
  initialAlertsToRender: PropTypes.number,
};

export { AlertGroup };
