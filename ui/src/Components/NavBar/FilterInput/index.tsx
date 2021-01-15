import React, { FC, useEffect, useState, useRef, useCallback } from "react";

import { observer } from "mobx-react-lite";

import Autosuggest from "react-autosuggest";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { IsMobile } from "Common/Device";
import { useFetchGet } from "Hooks/useFetchGet";
import { useDebounce } from "Hooks/useDebounce";
import { useOnClickOutside } from "Hooks/useOnClickOutside";
import { FilterInputLabel } from "Components/Labels/FilterInputLabel";
import { AutosuggestTheme } from "./Constants";
import { History } from "./History";

const FilterInput: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
}> = observer(({ alertStore, settingsStore }) => {
  const autosuggestRef = useRef<Autosuggest | null>(null);
  const inputRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [value, setValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const onSuggestionsClearRequested = useCallback(() => setSuggestions([]), []);

  const onSuggestionSelected = useCallback(
    (_, { suggestion }) => {
      setValue("");
      alertStore.filters.addFilter(suggestion);
    },
    [alertStore.filters]
  );

  const onChange = useCallback((_, { newValue }) => setValue(newValue), []);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (value !== "") {
        alertStore.filters.addFilter(value);
        setValue("");
      }
    },
    [alertStore.filters, value]
  );

  useEffect(() => {
    inputRef.current = ((autosuggestRef.current as Autosuggest)
      .input as HTMLInputElement).parentElement;
    if (!IsMobile()) {
      ((autosuggestRef.current as Autosuggest)
        .input as HTMLInputElement).focus();
      setIsFocused(true);
    }
  }, []);

  const onBlur = useCallback(() => setIsFocused(false), []);
  useOnClickOutside(formRef, onBlur, true);

  const [term, setTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce<string>(term, 300);

  const { response, error, isLoading, get, cancelGet } = useFetchGet<string[]>(
    FormatBackendURI(`autocomplete.json?term=${debouncedSearchTerm}`),
    { autorun: false }
  );

  useEffect(() => {
    if (debouncedSearchTerm) {
      get();
    }
    return () => cancelGet();
  }, [get, cancelGet, debouncedSearchTerm]);

  useEffect(() => {
    if (error) {
      onSuggestionsClearRequested();
    } else if (!isLoading && response !== null) {
      setSuggestions(response);
    }
  }, [response, error, isLoading, onSuggestionsClearRequested]);

  const onInputClick = (className: string) => {
    if (
      typeof className === "string" &&
      className.split(" ").includes("form-control")
    ) {
      ((autosuggestRef.current as Autosuggest)
        .input as HTMLInputElement).focus();
      setIsFocused(true);
    }
  };

  const renderSuggestion = (
    suggestion: string,
    { query }: { query: string }
  ) => {
    const parts = suggestion.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => (
          <span
            key={i}
            style={
              part.toLowerCase() === query.toLowerCase()
                ? { fontWeight: "bold" }
                : {}
            }
          >
            {part}
          </span>
        ))}
      </span>
    );
  };

  const renderInputComponent: FC<{ value: string }> = ({
    value,
    ...inputProps
  }) => {
    return (
      <React.Fragment>
        {alertStore.filters.values.length ? null : (
          <span className="input-group-text d-inline-block mr-2 border-0 bg-inherit px-1">
            <FontAwesomeIcon icon={faSearch} />
          </span>
        )}
        <input
          className="components-filterinput-wrapper text-white mw-100"
          placeholder=""
          size={value.length + 1}
          value={value}
          {...inputProps}
        />
      </React.Fragment>
    );
  };

  return (
    // data-filters is there to register filters for observation in mobx
    // in order to re-render input component
    <form className="form-inline mw-100" onSubmit={onSubmit}>
      <div
        ref={formRef}
        className={`input-group w-100 mr-2 components-filterinput-outer ${
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
          <Autosuggest
            ref={autosuggestRef}
            suggestions={suggestions}
            onSuggestionsFetchRequested={({ value }) => setTerm(value)}
            onSuggestionsClearRequested={onSuggestionsClearRequested}
            onSuggestionSelected={onSuggestionSelected}
            shouldRenderSuggestions={(value) =>
              value ? value.trim().length > 1 : false
            }
            getSuggestionValue={(suggestion) => suggestion}
            renderSuggestion={renderSuggestion}
            renderInputComponent={renderInputComponent}
            inputProps={{
              value: value,
              onChange: onChange,
              onFocus: () => setIsFocused(true),
              onBlur: onBlur,
            }}
            theme={AutosuggestTheme}
          />
        </div>
        <div className="input-group-append">
          <History alertStore={alertStore} settingsStore={settingsStore} />
        </div>
      </div>
    </form>
  );
});

export { FilterInput };
