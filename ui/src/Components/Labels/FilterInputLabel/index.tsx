import { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { AlertStore, FilterT } from "Stores/AlertStore";
import { QueryOperators } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { GetClassAndStyle } from "Components/Labels/Utils";
import { InlineEdit } from "Components/InlineEdit";

const FilterInputLabel: FC<{
  alertStore: AlertStore;
  filter: FilterT;
}> = observer(({ alertStore, filter }) => {
  const onChange = (val: string) => {
    alertStore.status.resume();
    // if filter is empty string then remove it
    if (val === "") {
      alertStore.filters.removeFilter(filter.raw);
    }
    // if not empty replace it
    alertStore.filters.replaceFilter(filter.raw, val);
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

  return (
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
            <span className="badge bg-light rounded-pill">{filter.hits}</span>
          ) : null
        ) : (
          <FontAwesomeIcon icon={faSpinner} spin />
        )
      ) : (
        <FontAwesomeIcon icon={faExclamationCircle} className="text-danger" />
      )}
      <TooltipWrapper
        title="Click to edit this filter"
        className="components-filteredinputlabel-text flex-grow-1 flex-shrink-1 ms-1"
      >
        <InlineEdit
          className="cursor-text px-1"
          classNameEditing="px-1 py-0 border-0 editing rounded"
          value={filter.raw}
          onChange={onChange}
          onEnterEditing={alertStore.status.pause}
          onExitEditing={alertStore.status.resume}
        />
      </TooltipWrapper>
      <FontAwesomeIcon
        className="cursor-pointer text-reset ms-1"
        icon={faTimes}
        onClick={() => alertStore.filters.removeFilter(filter.raw)}
      />
    </button>
  );
});

export { FilterInputLabel };
