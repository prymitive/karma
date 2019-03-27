import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { RIEInput } from "@attently/riek";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.css";

const FilterInputLabel = observer(
  class FilterInputLabel extends BaseLabel {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      filter: PropTypes.shape({
        raw: PropTypes.string,
        applied: PropTypes.bool,
        hits: PropTypes.number,
        name: PropTypes.string,
        matcher: PropTypes.string,
        value: PropTypes.string
      })
    };

    onChange = update => {
      const { alertStore, filter } = this.props;

      // if filter is empty string then remove it
      if (update.raw === "") {
        alertStore.filters.removeFilter(filter.raw);
      }

      // if not empty replace it
      alertStore.filters.replaceFilter(filter.raw, update.raw);
    };

    render() {
      const { filter, alertStore } = this.props;

      let cs = this.getClassAndStyle(
        filter.matcher === QueryOperators.Equal ? filter.name : "",
        filter.matcher === QueryOperators.Equal ? filter.value : "",
        "components-filteredinputlabel"
      );

      const showCounter =
        alertStore.filters.values.filter(
          f => f.hits !== alertStore.info.totalAlerts
        ).length > 0;

      const rootClasses = filter.applied
        ? cs.className
        : [
            "badge-secondary components-filteredinputlabel",
            ...cs.baseClassNames
          ].join(" ");

      return (
        <span
          className={`${rootClasses} d-inline-flex flex-row`}
          style={filter.applied ? cs.style : {}}
        >
          {filter.isValid ? (
            filter.applied ? (
              showCounter ? (
                <span className="badge badge-light badge-pill mr-1">
                  {filter.hits}
                </span>
              ) : null
            ) : (
              <span className="badge mr-1 p-0">
                <FontAwesomeIcon icon={faSpinner} spin />
              </span>
            )
          ) : (
            <span className="text-danger mr-1">
              <FontAwesomeIcon icon={faExclamationCircle} />
            </span>
          )}
          <TooltipWrapper title="Click to edit this filter" className="my-auto">
            <RIEInput
              className="align-middle"
              defaultValue=""
              value={filter.raw}
              propName="raw"
              change={this.onChange}
              classEditing="py-0 border-0 bg-light"
            />
          </TooltipWrapper>
          <button
            type="button"
            className="close ml-1 align-middle"
            style={filter.applied ? cs.style : {}}
            onClick={() => alertStore.filters.removeFilter(filter.raw)}
          >
            <span
              className={cs.colorClassNames
                .filter(c => !c.match(/badge-/))
                .join(" ")}
            >
              &times;
            </span>
          </button>
        </span>
      );
    }
  }
);

export { FilterInputLabel };
