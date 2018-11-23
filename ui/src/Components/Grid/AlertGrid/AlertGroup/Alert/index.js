import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { APIAlert, APIGroup } from "Models/API";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { StaticLabels } from "Common/Query";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { RenderNonLinkAnnotation, RenderLinkAnnotation } from "../Annotation";
import { Silence } from "../Silence";
import { AlertMenu } from "./AlertMenu";

import "./index.css";

const Alert = observer(
  class Alert extends Component {
    static propTypes = {
      group: APIGroup.isRequired,
      alert: APIAlert.isRequired,
      showAlertmanagers: PropTypes.bool.isRequired,
      showReceiver: PropTypes.bool.isRequired,
      afterUpdate: PropTypes.func.isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    render() {
      const {
        group,
        alert,
        showAlertmanagers,
        showReceiver,
        afterUpdate,
        silenceFormStore
      } = this.props;

      let classNames = [
        "components-grid-alertgrid-alertgroup-alert",
        "list-group-item",
        "pl-1 pr-0 py-0",
        "my-1",
        "rounded-0",
        "border-left-1 border-right-0 border-top-0 border-bottom-0",
        BorderClassMap[alert.state] || "border-warning"
      ];

      return (
        <li data-alert-json={JSON.stringify(alert)} className={classNames.join(" ")}>
          <div>
            {alert.annotations.filter(a => a.isLink === false).map(a => (
              <RenderNonLinkAnnotation
                key={a.name}
                name={a.name}
                value={a.value}
                visible={a.visible}
                afterUpdate={afterUpdate}
              />
            ))}
          </div>
          <AlertMenu
            group={group}
            alert={alert}
            silenceFormStore={silenceFormStore}
          />
          {Object.entries(alert.labels).map(([name, value]) => (
            <FilteringLabel key={name} name={name} value={value} />
          ))}
          {showAlertmanagers
            ? alert.alertmanager.map(am => (
                <FilteringLabel
                  key={am.name}
                  name={StaticLabels.AlertManager}
                  value={am.name}
                />
              ))
            : null}
          {showReceiver ? (
            <FilteringLabel
              name={StaticLabels.Receiver}
              value={alert.receiver}
            />
          ) : null}
          {alert.annotations.filter(a => a.isLink === true).map(a => (
            <RenderLinkAnnotation key={a.name} name={a.name} value={a.value} />
          ))}
          {alert.alertmanager.map(am =>
            am.silencedBy.map(silenceID => (
              <Silence
                key={silenceID}
                silenceFormStore={silenceFormStore}
                alertmanagerState={am}
                silenceID={silenceID}
                afterUpdate={afterUpdate}
              />
            ))
          )}
        </li>
      );
    }
  }
);

export { Alert };
