import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { RIEInput } from "@attently/riek";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { DefaultLabelClass } from "Common/Colors";
import { QueryOperators } from "Common/Query";
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

      let classNames = [
        "components-label",
        "components-filteredinputlabel",
        "badge",
        "text-nowrap",
        "text-truncate",
        "mw-100"
      ];
      let style = {};
      if (!filter.applied) {
        classNames.push("badge-secondary");
      } else if (filter.matcher === QueryOperators.Equal) {
        // only pass color class & style for equality matchers (foo=bar)
        // if we have foo!=bar filter then it should't get the color we use
        // for "foo: bar" labels
        classNames.push(
          `badge-${this.getColorClass(filter.name, filter.value)}`
        );
        style = this.getColorStyle(filter.name, filter.value);
      } else {
        classNames.push(`badge-${DefaultLabelClass}`);
      }

      return (
        <span
          className={classNames.join(" ")}
          style={style}
          data-tooltip="Click to edit this filter"
        >
          <button
            type="button"
            className="close ml-1"
            style={style}
            onClick={() => alertStore.filters.removeFilter(filter.raw)}
          >
            <span className="align-text-bottom">&times;</span>
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
          <RIEInput
            defaultValue=""
            value={filter.raw}
            propName="raw"
            change={this.onChange}
            classEditing="py-0 border-0 bg-light"
          />
        </span>
      );
    }
  }
);

export { FilterInputLabel };
