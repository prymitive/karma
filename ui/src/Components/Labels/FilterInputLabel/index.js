import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react";

import { RIEInput } from "@attently/riek";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { GetClassAndStyle } from "Components/Labels/Utils";

const FilterInputLabel = ({ alertStore, filter }) => {
  const onChange = ({ raw }) => {
    // if filter is empty string then remove it
    if (raw === "") {
      alertStore.filters.removeFilter(filter.raw);
    }
    // if not empty replace it
    alertStore.filters.replaceFilter(filter.raw, raw);
  };

  const cs = GetClassAndStyle(
    alertStore,
    filter.matcher === QueryOperators.Equal ? filter.name : "",
    filter.matcher === QueryOperators.Equal ? filter.value : "",
    "components-filteredinputlabel btn-sm",
    "btn"
  );

  const rootClasses = filter.applied
    ? cs.className
    : [
        "btn-secondary btn-sm components-filteredinputlabel",
        ...cs.baseClassNames,
      ].join(" ");

  return useObserver(() => (
    <button
      type="button"
      className={`${rootClasses} d-inline-flex flex-row align-items-center`}
      style={filter.applied ? cs.style : {}}
    >
      {filter.isValid ? (
        filter.applied ? (
          alertStore.filters.values.filter(
            (f) => f.hits !== alertStore.info.totalAlerts
          ).length > 0 ? (
            <span className="badge badge-light badge-pill">{filter.hits}</span>
          ) : null
        ) : (
          <FontAwesomeIcon icon={faSpinner} spin />
        )
      ) : (
        <FontAwesomeIcon icon={faExclamationCircle} className="text-danger" />
      )}
      <TooltipWrapper
        title="Click to edit this filter"
        className="components-filteredinputlabel-text flex-grow-1 flex-shrink-1 ml-1"
      >
        <RIEInput
          className="cursor-text px-1"
          defaultValue=""
          value={filter.raw}
          propName="raw"
          change={onChange}
          classEditing="py-0 border-0 editing rounded"
          afterStart={alertStore.status.pause}
          afterFinish={alertStore.status.resume}
        />
      </TooltipWrapper>
      <FontAwesomeIcon
        className="cursor-pointer text-reset ml-1 close"
        icon={faTimes}
        onClick={() => alertStore.filters.removeFilter(filter.raw)}
      />
    </button>
  ));
};
FilterInputLabel.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  filter: PropTypes.shape({
    raw: PropTypes.string,
    applied: PropTypes.bool,
    isValid: PropTypes.bool,
    hits: PropTypes.number,
    name: PropTypes.string,
    matcher: PropTypes.string,
    value: PropTypes.string,
  }),
};

export { FilterInputLabel };
