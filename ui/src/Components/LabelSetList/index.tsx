import { FC, useState } from "react";

import { AlertStore } from "Stores/AlertStore";
import { APIAlertGroupT } from "Models/APITypes";
import { IsMobile } from "Common/Device";
import { hashObject } from "Common/Hash";
import StaticLabel from "Components/Labels/StaticLabel";
import { PageSelect } from "Components/Pagination";

// take a list of groups and outputs a list of label sets, this ignores
// the receiver, so we'll end up with only unique alerts
const GroupListToUniqueLabelsList = (
  groups: APIAlertGroupT[]
): { [labelName: string]: string }[] => {
  const alerts: { [alertHash: string]: { [labelName: string]: string } } = {};
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

const LabelSetList: FC<{
  alertStore: AlertStore;
  labelsList: { [labelName: string]: string }[];
  title?: string;
}> = ({ alertStore, labelsList, title }) => {
  const [activePage, setActivePage] = useState<number>(1);

  const maxPerPage = IsMobile() ? 5 : 10;

  return labelsList.length > 0 ? (
    <div>
      {title ? <p className="lead text-center">{title}</p> : null}
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
        maxPerPage={maxPerPage}
        totalItemsCount={labelsList.length}
        setPageCallback={setActivePage}
      />
    </div>
  ) : (
    <div className="px-2 py-5 bg-transparent">
      <h1 className="display-5 text-placeholder text-center">
        No alerts matched
      </h1>
    </div>
  );
};

export { LabelSetList, GroupListToUniqueLabelsList };
