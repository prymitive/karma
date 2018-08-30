import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { debounce } from "lodash";

import Autosuggest from "react-autosuggest";
import Highlight from "react-highlighter";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore, FormatUnseeBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { FilterInputLabel } from "Components/Labels/FilterInputLabel";
import { AutosuggestTheme } from "./Constants";
import { History } from "./History";

import "./index.css";

const FilterInput = observer(
  class FilterInput extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    inputStore = observable(
      {
        ref: null,
        suggestions: [],
        suggestionsFetch: null,
        value: "",
        storeInputReference(ref) {
          this.ref = ref;
        }
      },
      {
        storeInputReference: action.bound
      },
      { name: "Filter input state" }
    );

    componentDidMount() {
      if (this.inputStore.ref !== null) {
        this.inputStore.ref.input.focus();
      }
    }

    onChange = action((event, { newValue, method }) => {
      // onChange here handles change for the user input in the filter bar
      // we need to update inputStore.value every time user types in something
      event.preventDefault();
      this.inputStore.value = newValue;
    });

    onSubmit = action(event => {
      event.preventDefault();
      if (this.inputStore.value !== "") {
        this.props.alertStore.filters.addFilter(this.inputStore.value);
        this.inputStore.value = "";
      }
    });

    onSuggestionsClearRequested = action(() => {
      this.inputStore.suggestions = [];
    });

    onSuggestionsFetchRequested = debounce(
      action(({ value }) => {
        if (value !== "") {
          this.inputStore.suggestionsFetch = fetch(
            FormatUnseeBackendURI(`autocomplete.json?term=${value}`)
          )
            .then(
              result => result.json(),
              err => {
                return [];
              }
            )
            .then(result => result.slice(0, 20))
            .then(result => {
              this.inputStore.suggestions = result;
            })
            .catch(err => console.error(err.message));
        }
      }),
      300
    );

    onSuggestionSelected = action((event, { suggestion }) => {
      this.inputStore.value = "";
      this.props.alertStore.filters.addFilter(suggestion);
    });

    onInputClick = (inputReference, event) => {
      if (event.target.className.split(" ").includes("form-control")) {
        inputReference.input.focus();
      }
    };

    renderSuggestion = (suggestion, { query, isHighlighted }) => {
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

    renderInputComponent = inputProps => {
      var {
        inputReference,
        alertStore,
        settingsStore,
        ...otherProps
      } = inputProps;

      return (
        <div className="input-group mr-2">
          <div className="input-group-prepend">
            <span className="input-group-text px-2">
              <FontAwesomeIcon icon={faSearch} />
            </span>
          </div>
          <div
            className="form-control p-1 components-filterinput"
            onClick={event => {
              this.onInputClick(inputReference, event);
            }}
          >
            {alertStore.filters.values.map(filter => (
              <FilterInputLabel
                key={filter.raw}
                alertStore={alertStore}
                filter={filter}
              />
            ))}
            <input
              className="components-filterinput-wrapper"
              placeholder=""
              {...otherProps}
            />
          </div>
          <div className="input-group-append">
            <History alertStore={alertStore} settingsStore={settingsStore} />
          </div>
        </div>
      );
    };

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        // data-filters is there to register filters for observation in mobx
        // in order to re-render input component
        <form
          className="form-inline mw-100"
          onSubmit={this.onSubmit}
          data-filters={alertStore.filters.values.map(f => f.raw).join(" ")}
        >
          <Autosuggest
            ref={this.inputStore.storeInputReference}
            suggestions={this.inputStore.suggestions}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            onSuggestionSelected={this.onSuggestionSelected}
            shouldRenderSuggestions={value => value && value.trim().length > 1}
            getSuggestionValue={suggestion => suggestion}
            renderSuggestion={this.renderSuggestion}
            renderInputComponent={this.renderInputComponent}
            inputProps={{
              value: this.inputStore.value,
              onChange: this.onChange,
              inputReference: this.inputStore.ref,
              alertStore: alertStore,
              settingsStore: settingsStore
            }}
            theme={AutosuggestTheme}
          />
        </form>
      );
    }
  }
);

export { FilterInput };
