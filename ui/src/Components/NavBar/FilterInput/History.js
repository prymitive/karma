import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";
import { localStored } from "mobx-stored";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faSave } from "@fortawesome/free-regular-svg-icons/faSave";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { IsMobile } from "Common/Device";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { HistoryLabel } from "Components/Labels/HistoryLabel";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

// takes a filter object out of alertStore.history.values and creates a new
// object with only those keys that will be stored in history
function ReduceFilter(filter) {
  return {
    raw: filter.raw,
    name: filter.name,
    matcher: filter.matcher,
    value: filter.value,
  };
}

const ActionButton = ({ color, icon, title, action, afterClick }) => (
  <button
    className={`component-history-button btn btn-sm btn-${color}`}
    onClick={() => {
      action();
      afterClick();
    }}
  >
    <FontAwesomeIcon icon={icon} className="mr-1" />
    {title}
  </button>
);
ActionButton.propTypes = {
  color: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  action: PropTypes.func.isRequired,
  afterClick: PropTypes.func.isRequired,
};

const HistoryMenu = ({
  popperPlacement,
  popperRef,
  popperStyle,
  filters,
  alertStore,
  settingsStore,
  afterClick,
  onClear,
}) => {
  const maxItems = IsMobile() ? 4 : 8;

  return (
    <div
      className="dropdown-menu d-block shadow components-navbar-historymenu"
      ref={popperRef}
      style={popperStyle}
      data-placement={popperPlacement}
    >
      <h6 className="dropdown-header text-center">
        <FontAwesomeIcon icon={faHistory} className="mr-1" />
        Last used filters
      </h6>
      {filters.length === 0 ? (
        <h6 className="dropdown-header text-muted text-center">Empty</h6>
      ) : (
        filters.slice(0, maxItems).map((historyFilters, index) => (
          <button
            className="dropdown-item cursor-pointer px-3"
            key={`${index}/${historyFilters.length}`}
            onClick={() => {
              alertStore.filters.setFilters(historyFilters.map((f) => f.raw));
              afterClick();
            }}
          >
            <div className="components-navbar-historymenu-labels pl-2">
              {historyFilters.map((f) => (
                <HistoryLabel
                  key={f.raw}
                  alertStore={alertStore}
                  name={f.name}
                  matcher={f.matcher}
                  value={f.value}
                />
              ))}
            </div>
          </button>
        ))
      )}
      <div className="dropdown-divider" />
      <div className="px-3 d-flex justify-content-center flex-wrap">
        <ActionButton
          color="success"
          icon={faSave}
          title="Save filters"
          action={() => {
            settingsStore.savedFilters.save(
              alertStore.filters.values.map((f) => f.raw)
            );
          }}
          afterClick={afterClick}
        />
        <ActionButton
          color="danger"
          icon={faUndoAlt}
          title="Reset filters"
          action={settingsStore.savedFilters.clear}
          afterClick={afterClick}
        />
        <ActionButton
          color="secondary"
          icon={faTrash}
          title="Clear history"
          action={onClear}
          afterClick={afterClick}
        />
      </div>
    </div>
  );
};
HistoryMenu.propTypes = {
  popperPlacement: PropTypes.string,
  popperRef: PropTypes.func,
  popperStyle: PropTypes.object,
  filters: PropTypes.array.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  afterClick: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

const History = ({ alertStore, settingsStore }) => {
  // this will be dumped to local storage via mobx-stored
  const history = localStored(
    "history.filters",
    {
      filters: [],
    },
    {
      delay: 100,
    }
  );

  const [isVisible, setIsVisible] = useState(false);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  const mountRef = useRef(false);

  // every time this component updates we will rewrite history
  // (if there are changes)
  useEffect(() => {
    if (mountRef.current) {
      // we don't store unapplied (we only have raw text for those, we need
      // name & value for coloring) or invalid filters
      // also check for value, name might be missing for fuzzy filters, but
      // the value should always be set
      const validAppliedFilters = alertStore.filters.values
        .filter((f) => f.applied && f.isValid && f.value)
        .map((f) => ReduceFilter(f));

      // don't store empty filters in history
      if (validAppliedFilters.length === 0) return;
      // make a JSON dump for comparing later with what's already stored
      const filtersJSON = JSON.stringify(validAppliedFilters);

      // rewrite history putting current filter set on top, this will move
      // it up if user selects a filter set that was already in history
      let newHistory = [
        ...[validAppliedFilters],
        ...history.filters.filter((f) => JSON.stringify(f) !== filtersJSON),
      ].slice(0, 8);
      history.filters = newHistory;
    } else {
      mountRef.current = true;
    }
  });

  const ref = useRef(null);
  useOnClickOutside(ref, hide, isVisible);

  return useObserver(() => (
    // data-filters is there to register filters for observation in mobx
    // it needs to be using full filter object to notice changes to
    // name & value but ignore hits
    // using it this way will force re-render on every change, which is
    // needed to keep track of all filter changes
    <span
      ref={ref}
      className="input-group-text border-0 rounded-0 bg-transparent px-0"
    >
      <Manager
        data-filters={alertStore.filters.values
          .map((f) => ReduceFilter(f))
          .join(" ")}
      >
        <Reference>
          {({ ref }) => (
            <button
              ref={ref}
              onClick={toggle}
              className="btn border-0 rounded-0 bg-transparent cursor-pointer components-navbar-history px-2 py-0 components-navbar-icon"
              type="button"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="true"
            >
              <FontAwesomeIcon icon={faCaretDown} />
            </button>
          )}
        </Reference>
        <DropdownSlide in={isVisible} unmountOnExit>
          <Popper modifiers={[{ name: "arrow", enabled: false }]}>
            {({ placement, ref, style }) => (
              <HistoryMenu
                popperPlacement={placement}
                popperRef={ref}
                popperStyle={style}
                filters={history.filters}
                onClear={() => {
                  history.filters = [];
                }}
                alertStore={alertStore}
                settingsStore={settingsStore}
                afterClick={hide}
              />
            )}
          </Popper>
        </DropdownSlide>
      </Manager>
    </span>
  ));
};
History.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { History, HistoryMenu, ReduceFilter };
