import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { RIEInput } from "@attently/riek";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators } from "Common/Query";
import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.scss";

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
        "components-filteredinputlabel btn-sm border-0",
        "btn"
      );

      const showCounter =
        alertStore.filters.values.filter(
          f => f.hits !== alertStore.info.totalAlerts
        ).length > 0;

      const rootClasses = filter.applied
        ? cs.className
        : [
            "btn-secondary btn-sm border-0 components-filteredinputlabel",
            ...cs.baseClassNames
          ].join(" ");

      return (
        <button
          type="button"
          className={`${rootClasses} d-inline-flex flex-row align-items-center`}
          style={filter.applied ? cs.style : {}}
        >
          {filter.isValid ? (
            filter.applied ? (
              showCounter ? (
                <span className="badge badge-light badge-pill">
                  {filter.hits}
                </span>
              ) : null
            ) : (
              <FontAwesomeIcon icon={faSpinner} spin />
            )
          ) : (
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="text-danger"
            />
          )}
          <span
            data-tip="Click to edit this filter"
            className="my-auto text-nowrap text-truncate align-text-bottom"
          >
            <RIEInput
              className="cursor-text ml-1"
              defaultValue=""
              value={filter.raw}
              propName="raw"
              change={this.onChange}
              classEditing="py-0 border-0 bg-light"
            />
          </span>
          <span
            className="close ml-1 align-text-bottom cursor-pointer"
            style={filter.applied ? cs.style : {}}
            onClick={() => alertStore.filters.removeFilter(filter.raw)}
          >
            <span
              className={cs.colorClassNames
                .filter(c => !c.match(/btn-|badge-/))
                .join(" ")}
            >
              &times;
            </span>
          </span>
        </button>
      );
    }
  }
);

export { FilterInputLabel };
