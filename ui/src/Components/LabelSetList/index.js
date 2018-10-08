import React from "react";
import PropTypes from "prop-types";

import hash from "object-hash";

import { AlertStore } from "Stores/AlertStore";
import { StaticLabel } from "Components/Labels/StaticLabel";

// take a list of groups and outputs a list of label sets, this ignores
// the receiver, so we'll end up with only unique alerts
const GroupListToUniqueLabelsList = groups => {
  const alerts = {};
  for (const group of groups) {
    for (const alert of group.alerts) {
      const alertLabels = Object.assign(
        {},
        group.labels,
        group.shared.labels,
        alert.labels
      );
      const alertHash = hash(alertLabels);
      alerts[alertHash] = alertLabels;
    }
  }
  return Object.values(alerts);
};

// used in new silence form preview stage and when deleting silences
const LabelSetList = ({ alertStore, labelsList }) =>
  labelsList.length > 0 ? (
    <ul className="list-group list-group-flush">
      {labelsList.map(labels => (
        <li key={hash(labels)} className="list-group-item px-0 pt-2 pb-1">
          {Object.entries(labels).map(([name, value]) => (
            <StaticLabel
              key={name}
              alertStore={alertStore}
              name={name}
              value={value}
            />
          ))}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-muted text-center">No alerts matched</p>
  );
LabelSetList.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  labelsList: PropTypes.arrayOf(PropTypes.object).isRequired
};

export { LabelSetList, GroupListToUniqueLabelsList };
