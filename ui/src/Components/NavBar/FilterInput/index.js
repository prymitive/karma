import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { debounce } from "lodash";

import Autosuggest from "react-autosuggest";
import Highlight from "react-highlighter";
import AutosizeInput from "react-input-autosize";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore, FormatUnseeBackendURI } from "Stores/AlertStore";
import { FilterInputLabel } from "Components/Labels/FilterInputLabel";
import { AutosuggestTheme } from "./Constants";
import { History } from "./History";

import "./index.css";

const FilterInput = observer(
  class FilterInput extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    inputStore = observable(
      {
        ref: null,
        suggestions: [],
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
      if (method === "enter") {
        event.preventDefault();
      } else {
        this.inputStore.value = newValue;
      }
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
          fetch(FormatUnseeBackendURI(`autocomplete.json?term=${value}`))
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

    renderSuggestion = (suggestion, { query, isHighlighted }) => {
      return <Highlight search={query}>{suggestion}</Highlight>;
    };

    renderInputComponent = inputProps => {
      var { inputReference, alertStore, ...otherProps } = inputProps;

      return (
        <div className="input-group input-group-sm">
          <div className="input-group-prepend">
            <span className="input-group-text">
              <FontAwesomeIcon icon={faSearch} />
            </span>
          </div>
          <div
            className="form-control p-1 components-filterinput"
            onClick={() => {
              inputReference.input.focus();
            }}
          >
            {alertStore.filters.values.map(filter => (
              <FilterInputLabel
                key={filter.raw}
                alertStore={alertStore}
                filter={filter}
              />
            ))}
            <AutosizeInput
              className="components-filterinput-wrapper"
              placeholder=""
              {...otherProps}
            />
          </div>
          <div className="input-group-append">
            <History alertStore={alertStore} />
          </div>
        </div>
      );
    };

    render() {
      const { alertStore } = this.props;

      return (
        // data-filters is there to register filters for observation in mobx
        // in order to re-render input component
        <form
          className="form-inline w-100"
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
              alertStore: alertStore
            }}
            theme={AutosuggestTheme}
          />
        </form>
      );
    }
  }
);

export { FilterInput };
