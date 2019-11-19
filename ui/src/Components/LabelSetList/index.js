import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import hash from "object-hash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons/faAngleDoubleRight";

import Pagination from "react-js-pagination";

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

const LabelSetList = observer(
  class LabelSetList extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      labelsList: PropTypes.arrayOf(PropTypes.object).isRequired
    };

    maxPerPage = 10;

    pagination = observable(
      {
        activePage: 1,
        onPageChange(pageNumber) {
          this.activePage = pageNumber;
        }
      },
      {
        onPageChange: action.bound
      }
    );

    render() {
      const { alertStore, labelsList } = this.props;

      return labelsList.length > 0 ? (
        <div>
          <p className="lead text-center">Affected alerts</p>
          <div>
            <ul className="list-group list-group-flush mb-3">
              {labelsList
                .slice(
                  (this.pagination.activePage - 1) * this.maxPerPage,
                  this.pagination.activePage * this.maxPerPage
                )
                .map(labels => (
                  <li
                    key={hash(labels)}
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
          {labelsList.length > this.maxPerPage ? (
            <div className="mt-3">
              <Pagination
                activePage={this.pagination.activePage}
                itemsCountPerPage={this.maxPerPage}
                totalItemsCount={labelsList.length}
                pageRangeDisplayed={5}
                onChange={this.pagination.onPageChange}
                hideFirstLastPages={labelsList.length / this.maxPerPage < 10}
                innerClass="pagination justify-content-center"
                itemClass="page-item"
                linkClass="page-link"
                activeClass="active"
                activeLinkClass="font-weight-bold"
                prevPageText={<FontAwesomeIcon icon={faAngleLeft} />}
                nextPageText={<FontAwesomeIcon icon={faAngleRight} />}
                firstPageText={<FontAwesomeIcon icon={faAngleDoubleLeft} />}
                lastPageText={<FontAwesomeIcon icon={faAngleDoubleRight} />}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted text-center">No alerts matched</p>
      );
    }
  }
);

export { LabelSetList, GroupListToUniqueLabelsList };
