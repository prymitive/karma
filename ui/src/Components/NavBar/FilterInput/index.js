import React, { useEffect, useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import Autosuggest from "react-autosuggest";
import Highlight from "react-highlighter";

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

const FilterInput = ({ alertStore, settingsStore }) => {
  const autosuggestRef = useRef();
  const inputRef = useRef();
  const formRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const onSuggestionsClearRequested = useCallback(() => setSuggestions([]), []);

  const onSuggestionSelected = useCallback(
    (event, { suggestion }) => {
      setValue("");
      alertStore.filters.addFilter(suggestion);
    },
    [alertStore.filters]
  );

  const onChange = useCallback((event, { newValue }) => setValue(newValue), []);

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
    inputRef.current = autosuggestRef.current.input.parentElement;
    if (!IsMobile()) {
      autosuggestRef.current.input.focus();
    }
  }, []);

  const onBlur = useCallback(() => setIsFocused(false), []);
  useOnClickOutside(formRef, onBlur, true);

  const [term, setTerm] = useState("");
  const debouncedSearchTerm = useDebounce(term, 300);

  const {
    response,
    error,
    isLoading,
    get,
    cancelGet,
  } = useFetchGet(
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
    } else if (!isLoading) {
      setSuggestions(response);
    }
  }, [response, error, isLoading, onSuggestionsClearRequested]);

  const onInputClick = (event) => {
    if (
      typeof event.target.className === "string" &&
      event.target.className.split(" ").includes("form-control")
    ) {
      autosuggestRef.current.input.focus();
    }
  };

  const renderSuggestion = (suggestion, { query, isHighlighted }) => {
    return (
      <Highlight
        matchElement="span"
        matchClass="font-weight-bold"
        search={query}
      >
        {suggestion}
      </Highlight>
    );
  };

  const renderInputComponent = (inputProps) => {
    const { value } = inputProps;
    return (
      <input
        className="components-filterinput-wrapper text-white mw-100"
        placeholder=""
        size={value.length + 1}
        {...inputProps}
      />
    );
  };

  return useObserver(() => (
    // data-filters is there to register filters for observation in mobx
    // in order to re-render input component
    <form className="form-inline mw-100" onSubmit={onSubmit}>
      <div
        ref={formRef}
        className={`input-group w-100 mr-2 components-filterinput-outer ${
          isFocused ? "bg-focused" : "bg-transparent"
        }`}
      >
        <div className="input-group-prepend">
          <span className="input-group-text px-2 border-0 rounded-0 bg-transparent components-navbar-icon">
            <FontAwesomeIcon icon={faSearch} />
          </span>
        </div>
        <div
          className="form-control components-filterinput border-0 rounded-0 bg-transparent"
          onClick={onInputClick}
          onFocus={() => setIsFocused(true)}
          onBlur={onBlur}
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
              value && value.trim().length > 1
            }
            getSuggestionValue={(suggestion) => suggestion}
            renderSuggestion={renderSuggestion}
            renderInputComponent={renderInputComponent}
            inputProps={{
              value: value,
              onChange: onChange,
            }}
            theme={AutosuggestTheme}
          />
        </div>
        <div
          className={`input-group-append ${
            isFocused ? "bg-focused" : "bg-transparent"
          }`}
        >
          <History alertStore={alertStore} settingsStore={settingsStore} />
        </div>
      </div>
    </form>
  ));
};
FilterInput.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { FilterInput };
