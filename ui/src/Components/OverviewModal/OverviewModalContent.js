import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { LabelWithPercent } from "Components/Labels/LabelWithPercent";

const TableRows = observer(({ alertStore, nameStats }) =>
  nameStats.map(nameStats => (
    <tr key={nameStats.name}>
      <td width="25%" className="text-nowrap mw-100 p-1">
        <span className="badge badge-light components-label mx-0 mt-0 mb-auto pl-0 text-left">
          <span className="bg-primary text-white mr-1 px-1 components-labelWithPercent-percent">
            {nameStats.hits}
          </span>
          {nameStats.name}
        </span>
      </td>
      <td width="75%" className="mw-100 p-1">
        {nameStats.values.slice(0, 9).map((valueStats, i) => (
          <LabelWithPercent
            alertStore={alertStore}
            key={valueStats.value}
            name={nameStats.name}
            value={valueStats.value}
            hits={valueStats.hits}
            percent={valueStats.percent}
            offset={valueStats.offset}
            isActive={
              alertStore.filters.values.filter(f => f.raw === valueStats.raw)
                .length > 0
            }
          />
        ))}
        {nameStats.values.length > 9 ? (
          <div className="components-label badge my-2 text-muted mw-100">
            +{nameStats.values.length - 9} more
          </div>
        ) : null}
      </td>
    </tr>
  ))
);

const LabelsTable = observer(
  ({ alertStore, showAllLabels, toggleAllLabels }) => (
    <React.Fragment>
      <table
        className="table table-borderless top-labels"
        style={{ tableLayout: "fixed" }}
      >
        <tbody className="mw-100">
          <TableRows
            alertStore={alertStore}
            nameStats={alertStore.data.counters.filter(
              nameStats => nameStats.hits >= alertStore.info.totalAlerts
            )}
          ></TableRows>
          {alertStore.data.counters.filter(
            nameStats => nameStats.hits < alertStore.info.totalAlerts
          ).length > 0 ? (
            <tr>
              <td colSpan="2" className="px-1 py-0">
                <TooltipWrapper
                  title="Toggle all / only common labels"
                  delay={[3000, 100]}
                >
                  <FontAwesomeIcon
                    icon={showAllLabels ? faChevronDown : faChevronUp}
                    className="cursor-pointer text-muted"
                    onClick={toggleAllLabels}
                  />
                </TooltipWrapper>
              </td>
            </tr>
          ) : null}
          {showAllLabels ? (
            <TableRows
              alertStore={alertStore}
              nameStats={alertStore.data.counters.filter(
                nameStats => nameStats.hits < alertStore.info.totalAlerts
              )}
            ></TableRows>
          ) : null}
        </tbody>
      </table>
    </React.Fragment>
  )
);

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

    allLabels = observable(
      {
        show: false,
        toggle() {
          this.show = !this.show;
        }
      },
      {
        toggle: action.bound
      }
    );

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
              <LabelsTable
                alertStore={alertStore}
                showAllLabels={this.allLabels.show}
                toggleAllLabels={this.allLabels.toggle}
              />
            )}
          </div>
        </React.Fragment>
      );
    }
  }
);

export { OverviewModalContent };
