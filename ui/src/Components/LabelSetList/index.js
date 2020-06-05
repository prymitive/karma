import React, { useState } from "react";
import PropTypes from "prop-types";

import { AlertStore } from "Stores/AlertStore";
import { IsMobile } from "Common/Device";
import { hashObject } from "Common/Hash";
import { StaticLabel } from "Components/Labels/StaticLabel";
import { PageSelect } from "Components/Pagination";

// take a list of groups and outputs a list of label sets, this ignores
// the receiver, so we'll end up with only unique alerts
const GroupListToUniqueLabelsList = (groups) => {
  const alerts = {};
  for (const group of groups) {
    for (const alert of group.alerts) {
      const alertLabels = Object.assign(
        {},
        group.labels,
        group.shared.labels,
        alert.labels
      );
      const alertHash = hashObject(alertLabels);
      alerts[alertHash] = alertLabels;
    }
  }
  return Object.values(alerts);
};

const LabelSetList = ({ alertStore, labelsList }) => {
  const [activePage, setActivePage] = useState(1);

  const maxPerPage = IsMobile() ? 5 : 10;

  return labelsList.length > 0 ? (
    <div>
      <p className="lead text-center">Affected alerts</p>
      <div>
        <ul className="list-group list-group-flush mb-3">
          {labelsList
            .slice((activePage - 1) * maxPerPage, activePage * maxPerPage)
            .map((labels, index) => (
              <li
                key={`${index}/${labels.length}`}
                className="list-group-item px-0 pt-2 pb-1"
              >
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
      </div>
      <PageSelect
        totalPages={Math.ceil(labelsList.length / maxPerPage)}
        activePage={activePage}
        maxPerPage={maxPerPage}
        totalItemsCount={labelsList.length}
        setPageCallback={setActivePage}
      />
    </div>
  ) : (
    <p className="text-muted text-center">No alerts matched</p>
  );
};
LabelSetList.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  labelsList: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export { LabelSetList, GroupListToUniqueLabelsList };
