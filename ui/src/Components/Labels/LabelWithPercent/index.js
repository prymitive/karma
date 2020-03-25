import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators, FormatQuery } from "Common/Query";
import { BaseLabel } from "Components/Labels/BaseLabel";

const LabelWithPercent = observer(
  class LabelWithPercent extends BaseLabel {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      name: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      hits: PropTypes.number.isRequired,
      percent: PropTypes.number.isRequired,
      offset: PropTypes.number.isRequired,
      isActive: PropTypes.bool.isRequired,
    };

    removeFromFilters = () => {
      const { alertStore, name, value } = this.props;
      alertStore.filters.removeFilter(
        FormatQuery(name, QueryOperators.Equal, value)
      );
    };

    render() {
      const { name, value, hits, percent, offset, isActive } = this.props;

      let cs = this.getClassAndStyle(
        name,
        value,
        "components-label-with-hover mb-0 pl-0 text-left"
      );

      const progressBarBg =
        percent > 66 ? "bg-danger" : percent > 33 ? "bg-warning" : "bg-success";

      return (
        <div className="d-inline-block mw-100">
          <span className={cs.className} style={cs.style}>
            <span className="mr-1 px-1 bg-primary text-white components-labelWithPercent-percent">
              {hits}
            </span>
            <span onClick={(e) => this.handleClick(e)}>
              <span className="components-label-name">{name}:</span>{" "}
              <span className="components-label-value">{value}</span>
            </span>
            {isActive ? (
              <FontAwesomeIcon
                className="cursor-pointer text-reset ml-1 close"
                style={{ fontSize: "100%" }}
                icon={faTimes}
                onClick={this.removeFromFilters}
              />
            ) : null}
          </span>
          <div className="progress components-labelWithPercent-progress mr-1">
            {offset === 0 ? null : (
              <div
                className="progress-bar bg-transparent"
                role="progressbar"
                style={{ width: offset + "%" }}
                aria-valuenow={offset}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            )}
            <div
              className={`progress-bar ${progressBarBg}`}
              role="progressbar"
              style={{ width: percent + "%" }}
              aria-valuenow={percent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>
      );
    }
  }
);

export { LabelWithPercent };
