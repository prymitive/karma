import { FC, useEffect, useState, useRef, useCallback } from "react";

import { observer } from "mobx-react-lite";

import {
  useCombobox,
  UseComboboxState,
  UseComboboxStateChangeOptions,
} from "downshift";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { IsMobile } from "Common/Device";
import { useFetchGet } from "Hooks/useFetchGet";
import { useDebounce } from "Hooks/useDebounce";
import { useOnClickOutside } from "Hooks/useOnClickOutside";
import { FilterInputLabel } from "Components/Labels/FilterInputLabel";
import { History } from "./History";

const FilterInput: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
}> = observer(({ alertStore, settingsStore }) => {
  const formRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  useEffect(() => {
    if (!IsMobile()) {
      inputRef.current?.focus();
      setIsFocused(true);
    }
  }, []);
  const onBlur = useCallback(() => setIsFocused(false), []);
  useOnClickOutside(formRef, onBlur, true);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [term, setTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce<string>(term, 300);

  const { response, error, isLoading, get, cancelGet } = useFetchGet<string[]>(
    FormatBackendURI(`autocomplete.json?term=${debouncedSearchTerm}`),
    { autorun: false }
  );

  // eslint-disable-next-line @typescript-eslint/ban-types
  const stateReducer = (
    state: UseComboboxState<string>,
    actionAndChanges: UseComboboxStateChangeOptions<string>
  ) => {
    const { type, changes } = actionAndChanges;
    switch (type) {
      case useCombobox.stateChangeTypes.InputBlur: {
        onBlur();
        return changes;
      }
      default:
        return changes;
    }
  };

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps,
    setInputValue,
    inputValue,
  } = useCombobox({
    stateReducer: stateReducer,
    items: suggestions,
    onInputValueChange: ({ inputValue }) => {
      if (inputValue) {
        setTerm(inputValue);
      } else {
        setTerm("");
        setSuggestions([]);
      }
    },
    onSelectedItemChange: ({ selectedItem }) => {
      applyFilter(selectedItem);
    },
  });

  const applyFilter = useCallback(
    (inputValue: string | null | undefined) => {
      if (inputValue) {
        alertStore.filters.addFilter(inputValue);
      }
      setInputValue("");
      setSuggestions([]);
    },
    [alertStore.filters, setInputValue]
  );

  const onInputClick = (className: string) => {
    if (
      typeof className === "string" &&
      className.split(" ").includes("form-control")
    ) {
      inputRef.current?.focus();
      setIsFocused(true);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm) {
      get();
    } else {
      setSuggestions([]);
    }
    return () => cancelGet();
  }, [get, cancelGet, debouncedSearchTerm]);

  useEffect(() => {
    if (error) {
      setSuggestions([]);
    } else if (!isLoading && response !== null) {
      setSuggestions(response);
    }
  }, [response, error, isLoading]);

  return (
    // data-filters is there to register filters for observation in mobx
    // in order to re-render input component
    <form
      className="flex-grow-1 flex-shrink-1 mr-auto"
      style={{ minWidth: "0px" }}
      onSubmit={(event) => {
        event.preventDefault();
        applyFilter(inputValue);
      }}
    >
      <div
        ref={formRef}
        className={`input-group w-100 me-2 components-filterinput-outer ${
          isFocused ? "bg-focused" : "bg-transparent"
        }`}
      >
        <div
          className="form-control components-filterinput border-0 rounded-0 bg-inherit"
          onClick={(event) =>
            onInputClick((event.target as HTMLDivElement).className)
          }
        >
          {alertStore.filters.values.map((filter) => (
            <FilterInputLabel
              key={filter.raw}
              alertStore={alertStore}
              filter={filter}
            />
          ))}
          <div
            className="autosuggest d-inline-block mw-100"
            {...getComboboxProps()}
          >
            {alertStore.filters.values.length ? null : (
              <span className="input-group-text text-muted d-inline-block me-2 border-0 bg-inherit px-1">
                <FontAwesomeIcon icon={faSearch} />
              </span>
            )}
            <input
              className="components-filterinput-wrapper text-white mw-100"
              size={inputValue ? inputValue.length + 1 : 1}
              onClick={() => setIsFocused(true)}
              {...getInputProps({ ref: inputRef })}
            />
          </div>
          <span className="dropdown" {...getMenuProps()}>
            {isOpen && inputValue && suggestions.length ? (
              <div className="dropdown-menu show shadow m-0">
                {suggestions.slice(0, 10).map((item, index) => (
                  <li
                    className={`dropdown-item cursor-pointer ${
                      highlightedIndex === index ? "active" : ""
                    }`}
                    key={`${item}${index}`}
                    {...getItemProps({ item, index })}
                  >
                    {item
                      .split(new RegExp(`(${inputValue})`, "gi"))
                      .map((part, i) => (
                        <span
                          key={i}
                          style={
                            part.toLowerCase() === inputValue.toLowerCase()
                              ? { fontWeight: "bold" }
                              : {}
                          }
                        >
                          {part}
                        </span>
                      ))}
                  </li>
                ))}
              </div>
            ) : null}
          </span>
        </div>
        <History alertStore={alertStore} settingsStore={settingsStore} />
      </div>
    </form>
  );
});

export { FilterInput };
