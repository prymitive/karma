import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { LabelWithPercent } from "Components/Labels/LabelWithPercent";

const LabelsTable = observer(({ alertStore }) => (
  <table
    className="table table-borderless top-labels"
    style={{ tableLayout: "fixed" }}
  >
    <tbody className="mw-100">
      {alertStore.data.counters.map(nameStats => (
        <tr key={nameStats.name}>
          <td width="25%" className="text-nowrap mw-100 p-1">
            <span className="badge badge-light components-label mx-0 my-1 pl-0 text-left">
              <span className="bg-primary text-white mr-1 px-1 components-labelWithPercent-percent">
                {nameStats.hits}
              </span>
              {nameStats.name}
            </span>
          </td>
          <td width="75%" className="mw-100 p-1">
            {nameStats.values.slice(0, 9).map((valueStats, i, array) => (
              <LabelWithPercent
                key={valueStats.value}
                name={nameStats.name}
                value={valueStats.value}
                hits={valueStats.hits}
                percent={valueStats.percent}
                offset={array
                  .slice(0, i)
                  .map(ns => ns.percent)
                  .reduce((a, b) => a + b, 0)}
              />
            ))}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
));

const NothingToShow = () => (
  <div className="jumbotron bg-white">
    <h1 className="display-5 text-secondary text-center">
      No labels to display
    </h1>
  </div>
);

const OverviewModalContent = observer(
  class OverviewModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      onHide: PropTypes.func.isRequired
    };

    render() {
      const { alertStore, onHide } = this.props;

      return (
        <React.Fragment>
          <div className="modal-header">
            <h5 className="modal-title">Overview</h5>
            <button type="button" className="close" onClick={onHide}>
              <span className="align-middle">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {alertStore.data.counters.length === 0 ? (
              <NothingToShow />
            ) : (
              <LabelsTable alertStore={alertStore} />
            )}
          </div>
        </React.Fragment>
      );
    }
  }
);

export { OverviewModalContent };
