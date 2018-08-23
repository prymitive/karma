import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable, toJS } from "mobx";
import { observer } from "mobx-react";
import { localStored } from "mobx-stored";

import hash from "object-hash";

import { Manager, Reference, Popper } from "react-popper";
import onClickOutside from "react-onclickoutside";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faSave } from "@fortawesome/free-regular-svg-icons/faSave";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { HistoryLabel } from "Components/Labels/HistoryLabel";

import "./History.css";

const defaultHistory = {
  filters: []
};

// takes a filter object out of alertStore.history.values and creates a new
// object with only those keys that will be stored in history
function ReduceFilter(filter) {
  return {
    raw: filter.raw,
    name: filter.name,
    matcher: filter.matcher,
    value: filter.value
  };
}

const ActionButton = ({ color, icon, title, action, afterClick }) => (
  <button
    className={`component-history-button btn btn-sm btn-outline-${color}`}
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
  icon: PropTypes.object.isRequired,
  action: PropTypes.func.isRequired,
  afterClick: PropTypes.func.isRequired
};

const HistoryMenu = onClickOutside(
  ({
    popperPlacement,
    popperRef,
    popperStyle,
    filters,
    alertStore,
    settingsStore,
    afterClick,
    onClear
  }) => {
    return (
      <div
        className="dropdown-menu d-block components-navbar-historymenu"
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
          filters.map(historyFilters => (
            <button
              className="dropdown-item cursor-pointer px-3"
              key={hash(historyFilters.map(f => f.raw))}
              onClick={() => {
                alertStore.filters.setFilters(historyFilters.map(f => f.raw));
                afterClick();
              }}
            >
              <div className="components-navbar-historymenu-labels pl-2">
                {historyFilters.map(f => (
                  <HistoryLabel
                    key={f.raw}
                    alertStore={alertStore}
                    name={f.name}
                    value={f.value}
                  />
                ))}
              </div>
            </button>
          ))
        )}
        <div className="dropdown-divider" />
        <div className="container text-center">
          <ActionButton
            color="success"
            icon={faSave}
            title="Save filters"
            action={() => {
              settingsStore.savedFilters.save(
                alertStore.filters.values.map(f => f.raw)
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
            color="dark"
            icon={faTrash}
            title="Clear history"
            action={onClear}
            afterClick={afterClick}
          />
        </div>
      </div>
    );
  }
);
HistoryMenu.propTypes = {
  popperPlacement: PropTypes.string,
  popperRef: PropTypes.func,
  popperStyle: PropTypes.object,
  filters: PropTypes.array.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  afterClick: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired
};

const History = observer(
  class History extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    // how many filter sets do we store in local storage and render in the
    // dropdown menu
    maxSize = 8;
    // this will be dumped to local storage via mobx-stored
    history = localStored("history.filters", defaultHistory, { delay: 100 });

    collapse = observable(
      {
        value: true,
        toggle() {
          this.value = !this.value;
        },
        hide() {
          this.value = true;
        }
      },
      { toggle: action.bound, hide: action.bound },
      { name: "History menu toggle" }
    );

    appendToHistory = action(() => {
      const { alertStore } = this.props;

      // we don't store unapplied (we only have raw text for those, we need
      // name & value for coloring) or invalid filters
      const validAppliedFilters = alertStore.filters.values
        .filter(f => f.applied === true && f.isValid === true)
        .map(f => ReduceFilter(f));

      // don't store empty filters in history
      if (validAppliedFilters.length === 0) return;
      // make a JSON dump for comparing later with what's already stored
      const filtersJSON = JSON.stringify(validAppliedFilters);

      // dump observable array with stored filters to JS objects, without this
      // we'll be passing around and comparing proxy objects that might mutate
      // while we do so
      const storedFilters = toJS(this.history.filters);

      // rewrite history putting current filter set on top, this will move
      // it up if user selects a filter set that was already in history
      let newHistory = [
        ...[validAppliedFilters],
        ...storedFilters.filter(f => JSON.stringify(f) !== filtersJSON)
      ].slice(0, this.maxSize);
      this.history.filters = newHistory;
    });

    clearHistory = action(() => {
      this.history.filters = [];
    });

    componentDidUpdate() {
      // every time this component updates we will rewrite history
      // (if there are changes)
      this.appendToHistory();
    }

    handleClickOutside = action(event => {
      this.collapse.hide();
    });

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        // data-filters is there to register filters for observation in mobx
        // it needs to be using full filter object to notice changes to
        // name & value but ignore hits
        // using it this way will force re-render on every change, which is
        // needed to keep track of all filter changes
        <Manager
          data-filters={alertStore.filters.values
            .map(f => ReduceFilter(f))
            .join(" ")}
        >
          <Reference>
            {({ ref }) => (
              <button
                ref={ref}
                onClick={this.collapse.toggle}
                className="input-group-text rounded-right cursor-pointer components-navbar-history px-2"
                type="button"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="true"
              >
                <FontAwesomeIcon icon={faCaretDown} />
              </button>
            )}
          </Reference>
          {this.collapse.value ? null : (
            <Popper
              modifiers={{
                arrow: { enabled: false }
              }}
            >
              {({ placement, ref, style }) => (
                <HistoryMenu
                  popperPlacement={placement}
                  popperRef={ref}
                  popperStyle={style}
                  filters={this.history.filters}
                  onClear={this.clearHistory}
                  alertStore={alertStore}
                  settingsStore={settingsStore}
                  afterClick={this.collapse.hide}
                  handleClickOutside={this.collapse.hide}
                  outsideClickIgnoreClass="components-navbar-history"
                />
              )}
            </Popper>
          )}
        </Manager>
      );
    }
  }
);

export { History, ReduceFilter };
