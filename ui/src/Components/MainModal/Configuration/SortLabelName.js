import React from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import CreatableSelect from "react-select/lib/Creatable";

import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ReactSelectStyles } from "Components/MultiSelect";

const valueToOption = v => ({ label: v, value: v });

const SortLabelName = observer(
  class SortLabelName extends CreatableSelect {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    suggestions = observable({
      names: []
    });

    populateNameSuggestions = action(() => {
      this.nameSuggestionsFetch = fetch(FormatBackendURI(`labelNames.json`), {
        credentials: "include"
      })
        .then(
          result => result.json(),
          err => {
            return [];
          }
        )
        .then(result => {
          this.suggestions.names = result.map(value => ({
            label: value,
            value: value
          }));
        })
        .catch(err => {
          console.error(err.message);
          this.suggestions.names = [];
        });
    });

    onChange = action((newValue, actionMeta) => {
      const { settingsStore } = this.props;

      settingsStore.gridConfig.config.sortLabel = newValue.value;
    });

    componentDidMount() {
      this.populateNameSuggestions();
    }

    render() {
      const { settingsStore } = this.props;

      return (
        <CreatableSelect
          styles={ReactSelectStyles}
          classNamePrefix="react-select"
          instanceId="configuration-sort-label"
          defaultValue={valueToOption(
            settingsStore.gridConfig.config.sortLabel
          )}
          options={this.suggestions.names}
          onChange={this.onChange}
        />
      );
    }
  }
);

export { SortLabelName };
