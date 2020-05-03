import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import Autosuggest from "react-autosuggest";
import Highlight from "react-highlighter";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { IsMobile } from "Common/Device";
import { useFetchGet } from "Hooks/useFetchGet";
import { useDebounce } from "Hooks/useDebounce";
import { FilterInputLabel } from "Components/Labels/FilterInputLabel";
import { AutosuggestTheme } from "./Constants";
import { History } from "./History";

const FilterInput = ({ alertStore, settingsStore }) => {
  const autosuggestRef = useRef();
  const inputRef = useRef();

  const inputStore = useLocalStore(() => ({
    suggestions: [],
    value: "",
    focused: false,
    onChange(event, { newValue }) {
      // onChange here handles change for the user input in the filter bar
      // we need to update inputStore.value every time user types in something
      this.value = newValue;
    },
    onSubmit(event) {
      event.preventDefault();
      if (this.value !== "") {
        alertStore.filters.addFilter(this.value);
        this.value = "";
      }
    },
    onSuggestionsClearRequested() {
      this.suggestions = [];
    },
    onSuggestionSelected(event, { suggestion }) {
      this.value = "";
      alertStore.filters.addFilter(suggestion);
    },
    onFocus() {
      this.focused = true;
    },
    onBlur() {
      this.focused = false;
    },
  }));

  useEffect(() => {
    inputRef.current = autosuggestRef.current.input.parentElement;
    if (!IsMobile()) {
      autosuggestRef.current.input.focus();
    }
  }, []);

  const [term, setTerm] = useState("");
  const debouncedSearchTerm = useDebounce(term, 300);

  const { response, error, isLoading, get } = useFetchGet(
    FormatBackendURI(`autocomplete.json?term=${debouncedSearchTerm}`),
    { autorun: false }
  );

  useEffect(() => {
    if (debouncedSearchTerm) {
      get();
    }
  }, [get, debouncedSearchTerm]);

  useEffect(() => {
    if (error) {
      inputStore.onSuggestionsClearRequested();
    } else if (!isLoading) {
      inputStore.suggestions = response;
    }
  }, [response, error, isLoading, inputStore]);

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
    <form className="form-inline mw-100" onSubmit={inputStore.onSubmit}>
      <div
        className={`input-group w-100 mr-2 components-filterinput-outer ${
          inputStore.focused ? "bg-focused" : "bg-transparent"
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
          onFocus={inputStore.onFocus}
          onBlur={inputStore.onBlur}
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
            suggestions={inputStore.suggestions}
            onSuggestionsFetchRequested={({ value }) => setTerm(value)}
            onSuggestionsClearRequested={inputStore.onSuggestionsClearRequested}
            onSuggestionSelected={inputStore.onSuggestionSelected}
            shouldRenderSuggestions={(value) =>
              value && value.trim().length > 1
            }
            getSuggestionValue={(suggestion) => suggestion}
            renderSuggestion={renderSuggestion}
            renderInputComponent={renderInputComponent}
            inputProps={{
              value: inputStore.value,
              onChange: inputStore.onChange,
            }}
            theme={AutosuggestTheme}
          />
        </div>
        <div
          className={`input-group-append ${
            inputStore.focused ? "bg-focused" : "bg-transparent"
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
