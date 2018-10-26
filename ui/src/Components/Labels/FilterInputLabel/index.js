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

      return (
        <span
          className={
            filter.applied
              ? cs.className
              : ["badge-secondary", ...cs.baseClassNames].join(" ")
          }
          style={cs.style}
        >
          <button
            type="button"
            className="close ml-1"
            style={cs.style}
            onClick={() => alertStore.filters.removeFilter(filter.raw)}
          >
            <span
              className={`align-text-bottom ${cs.colorClassNames.join(" ")}`}
            >
              &times;
            </span>
          </button>
          {filter.isValid ? (
            filter.applied ? (
              <span className="badge badge-light badge-pill mr-1">
                {filter.hits}
              </span>
            ) : (
              <span className="mr-1">
                <FontAwesomeIcon icon={faSpinner} spin />
              </span>
            )
          ) : (
            <span className="text-danger mr-1">
              <FontAwesomeIcon icon={faExclamationCircle} />
            </span>
          )}
          <TooltipWrapper title="Click to edit this filter">
            <RIEInput
              defaultValue=""
              value={filter.raw}
              propName="raw"
              change={this.onChange}
              className={cs.colorClassNames.join(" ")}
              classEditing="py-0 border-0 bg-light"
            />
          </TooltipWrapper>
        </span>
      );
    }
  }
);

export { FilterInputLabel };
