import { FC, useCallback, MouseEvent } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators, FormatQuery } from "Common/Query";
import { GetClassAndStyle } from "Components/Labels/Utils";

const LabelWithPercent: FC<{
  alertStore: AlertStore;
  name: string;
  value: string;
  hits: number;
  percent: number;
  offset: number;
  isActive: boolean;
}> = ({ alertStore, name, value, hits, percent, offset, isActive }) => {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      // left click       => apply foo=bar filter
      // left click + alt => apply foo!=bar filter
      const operator =
        event.altKey === true ? QueryOperators.NotEqual : QueryOperators.Equal;

      event.preventDefault();

      alertStore.filters.addFilter(FormatQuery(name, operator, value));
    },
    [alertStore.filters, name, value]
  );

  const removeFromFilters = () => {
    alertStore.filters.removeFilter(
      FormatQuery(name, QueryOperators.Equal, value)
    );
  };

  const cs = GetClassAndStyle(
    alertStore,
    name,
    value,
    "components-label-with-hover mb-0 ps-0 text-start"
  );

  const progressBarBg =
    percent > 66 ? "bg-danger" : percent > 33 ? "bg-warning" : "bg-success";

  return (
    <div className="d-inline-block mw-100">
      <span className={cs.className} style={cs.style}>
        <span className="me-1 px-1 bg-primary text-white components-labelWithPercent-percent">
          {hits}
        </span>
        <span onClick={handleClick}>
          <span className="components-label-name">{name}:</span>{" "}
          <span className="components-label-value">{value}</span>
        </span>
        {isActive ? (
          <FontAwesomeIcon
            className="cursor-pointer text-reset ms-1"
            style={{ fontSize: "100%" }}
            icon={faTimes}
            onClick={removeFromFilters}
          />
        ) : null}
      </span>
      <div className="progress components-labelWithPercent-progress me-1">
        {offset === 0 ? null : (
          <div
            className="progress-bar bg-transparent"
            role="progressbar"
            style={{ width: offset + "%" }}
            aria-valuenow={offset}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
        <div
          className={`progress-bar ${progressBarBg}`}
          role="progressbar"
          style={{ width: percent + "%" }}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export default observer(LabelWithPercent);
