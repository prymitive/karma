import {
  FC,
  Ref,
  CSSProperties,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";

import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { localStored } from "mobx-stored";

import { Manager, Reference, Popper } from "react-popper";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faSave } from "@fortawesome/free-regular-svg-icons/faSave";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import { AlertStore, FilterT } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { IsMobile } from "Common/Device";
import { CommonPopperModifiers } from "Common/Popper";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import HistoryLabel from "Components/Labels/HistoryLabel";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

interface ReduceFilterT {
  raw: string;
  name: string;
  matcher: string;
  value: string;
}

// takes a filter object out of alertStore.history.values and creates a new
// object with only those keys that will be stored in history
function ReduceFilter(filter: FilterT): ReduceFilterT {
  return {
    raw: filter.raw,
    name: filter.name,
    matcher: filter.matcher,
    value: filter.value,
  };
}

const ActionButton: FC<{
  color: string;
  icon: IconDefinition;
  title: ReactNode;
  action: () => void;
  afterClick: () => void;
}> = ({ color, icon, title, action, afterClick }) => (
  <button
    className={`component-history-button btn btn-sm btn-${color}`}
    onClick={() => {
      action();
      afterClick();
    }}
  >
    <FontAwesomeIcon icon={icon} className="me-1" />
    {title}
  </button>
);

const HistoryMenu: FC<{
  popperPlacement?: string;
  popperRef?: Ref<HTMLDivElement>;
  popperStyle?: CSSProperties;
  filters: ReduceFilterT[][];
  alertStore: AlertStore;
  settingsStore: Settings;
  afterClick: () => void;
  onClear: () => void;
}> = ({
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
      className="dropdown-menu d-block shadow components-navbar-historymenu m-0"
      ref={popperRef}
      style={popperStyle}
      data-placement={popperPlacement}
    >
      <h6 className="dropdown-header text-center">
        <FontAwesomeIcon icon={faHistory} className="me-1" />
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
            <div className="components-navbar-historymenu-labels ps-2">
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

interface HistoryStorageT {
  filters: ReduceFilterT[][];
}

class HistoryStorage {
  config: HistoryStorageT = localStored(
    "filters",
    {
      filters: [] as ReduceFilterT[][],
    },
    {
      delay: 100,
    }
  );

  setFilters = action((newFilters: ReduceFilterT[][]) => {
    this.config.filters = newFilters;
  });
}

const History: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
}> = observer(({ alertStore, settingsStore }) => {
  // this will be dumped to local storage via mobx-stored
  const [history] = useState<HistoryStorage>(new HistoryStorage());
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  const mountRef = useRef<boolean>(false);

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
      const newHistory = [
        ...[validAppliedFilters],
        ...history.config.filters.filter(
          (f) => JSON.stringify(f) !== filtersJSON
        ),
      ].slice(0, 8);
      history.setFilters(newHistory);
    } else {
      mountRef.current = true;
    }
  });

  const ref = useRef<HTMLSpanElement | null>(null);
  useOnClickOutside(ref, hide, isVisible);

  return (
    // data-filters is there to register filters for observation in mobx
    // it needs to be using full filter object to notice changes to
    // name & value but ignore hits
    // using it this way will force re-render on every change, which is
    // needed to keep track of all filter changes
    <span
      ref={ref}
      className="input-group-text border-0 rounded-0 bg-inherit px-0"
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
              className="btn border-0 rounded-0 bg-inherit cursor-pointer components-navbar-history px-2 py-0 components-navbar-icon"
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
          <Popper modifiers={CommonPopperModifiers}>
            {({ placement, ref, style }) => (
              <HistoryMenu
                popperPlacement={placement}
                popperRef={ref}
                popperStyle={style}
                filters={history.config.filters}
                onClear={() => {
                  history.setFilters([]);
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
  );
});

export { History, HistoryMenu, ReduceFilter };
