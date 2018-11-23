import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action, toJS } from "mobx";

import hash from "object-hash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";

import { APIGroup } from "Models/API";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { MountFade } from "Components/Animations/MountFade";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { GroupHeader } from "./GroupHeader";
import { Alert } from "./Alert";
import { GroupFooter } from "./GroupFooter";

const LoadButton = ({ icon, action, tooltip }) => {
  return (
    <TooltipWrapper title={tooltip}>
      <button
        type="button"
        className="btn btn-sm py-0 bg-white"
        onClick={action}
      >
        <FontAwesomeIcon className="text-muted" icon={icon} />
      </button>
    </TooltipWrapper>
  );
};
LoadButton.propTypes = {
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  action: PropTypes.func.isRequired,
  tooltip: PropTypes.node.isRequired
};

const AllAlertsAreUsingSameAlertmanagers = alerts => {
  const usedAMs = alerts.map(alert =>
    alert.alertmanager.map(am => am.name).sort()
  );
  return usedAMs.every(
    listOfAMs => JSON.stringify(listOfAMs) === JSON.stringify(usedAMs[0])
  );
};

const AlertGroup = observer(
  class AlertGroup extends Component {
    static propTypes = {
      afterUpdate: PropTypes.func.isRequired,
      group: APIGroup.isRequired,
      showAlertmanagers: PropTypes.bool.isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    constructor(props) {
      super(props);

      this.defaultRenderCount = toJS(
        props.settingsStore.alertGroupConfig.config.defaultRenderCount
      );

      this.renderConfig = observable({
        alertsToRender: this.defaultRenderCount
      });
    }

    // store collapse state, alert groups can be collapsed to only show
    // the header, this is controlled by UI element on the header itself, so
    // this observable needs to be passed down to it
    collapse = observable(
      {
        value: false,
        toggle() {
          this.value = !this.value;
        }
      },
      {
        toggle: action.bound
      },
      { name: "Collpase toggle" }
    );

    loadMore = action(() => {
      const { group } = this.props;

      const step = this.getStepSize(group.alerts.length);

      // show cur+step, but not more that total alert count
      this.renderConfig.alertsToRender = Math.min(
        this.renderConfig.alertsToRender + step,
        group.alerts.length
      );
    });

    loadLess = action(() => {
      const { group } = this.props;

      const step = this.getStepSize(group.alerts.length);

      // show cur-step, but not less than 1
      this.renderConfig.alertsToRender = Math.max(
        this.renderConfig.alertsToRender - step,
        1
      );
    });

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
    getStepSize(totalSize) {
      const val = Math.min(
        Math.max(Math.round((totalSize - this.defaultRenderCount) / 5), 5),
        totalSize - this.defaultRenderCount
      );
      return val;
    }

    componentDidUpdate() {
      // whenever grid component re-renders we need to ensure that grid elements
      // are packed correctly
      this.props.afterUpdate();
    }

    render() {
      const {
        group,
        showAlertmanagers,
        afterUpdate,
        silenceFormStore
      } = this.props;

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
          footerAlertmanagers = group.alerts[0].alertmanager.map(am => am.name);
        }
      }

      return (
        <MountFade>
          <div data-group-json={JSON.stringify(group)} className="components-grid-alertgrid-alertgroup p-1">
            <div className="card">
              <div
                className={`card-body ${
                  this.collapse.value ? "p-2" : "px-2 pt-2 pb-1"
                }`}
              >
                <GroupHeader
                  collapseStore={this.collapse}
                  group={group}
                  silenceFormStore={silenceFormStore}
                />
                {this.collapse.value ? null : (
                  <ul className="list-group mt-1">
                    {group.alerts
                      .slice(0, this.renderConfig.alertsToRender)
                      .map(alert => (
                        <Alert
                          key={hash(alert.labels)}
                          group={group}
                          alert={alert}
                          showAlertmanagers={
                            showAlertmanagers && !showAlertmanagersInFooter
                          }
                          showReceiver={group.alerts.length === 1}
                          afterUpdate={afterUpdate}
                          silenceFormStore={silenceFormStore}
                        />
                      ))}
                    {group.alerts.length > this.defaultRenderCount ? (
                      <li className="list-group-item border-0 p-0 text-center">
                        <LoadButton
                          icon={faMinus}
                          action={this.loadLess}
                          tooltip="Show fewer alerts in this group"
                        />
                        <small className="text-muted mx-2">
                          {this.renderConfig.alertsToRender}
                          {" of "}
                          {group.alerts.length}
                        </small>
                        <LoadButton
                          icon={faPlus}
                          action={this.loadMore}
                          tooltip="Show more alerts in this group"
                        />
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
              {this.collapse.value === false && group.alerts.length > 1 ? (
                <GroupFooter
                  group={group}
                  alertmanagers={footerAlertmanagers}
                  afterUpdate={afterUpdate}
                />
              ) : null}
            </div>
          </div>
        </MountFade>
      );
    }
  }
);

export { AlertGroup };
