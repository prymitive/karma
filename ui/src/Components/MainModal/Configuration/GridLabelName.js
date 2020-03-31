import React from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import Creatable from "react-select/creatable";

import { FetchGet } from "Common/Fetch";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const disabledLabel = "Disable multi-grid";
const emptyValue = { label: disabledLabel, value: "" };
const valueToOption = (v) => ({ label: v ? v : disabledLabel, value: v });

const GridLabelName = observer(
  class GridLabelName extends Creatable {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };
    static contextType = ThemeContext;

    suggestions = observable({
      names: [],
    });

    populateNameSuggestions = action(() => {
      this.nameSuggestionsFetch = FetchGet(
        FormatBackendURI(`labelNames.json`),
        {}
      )
        .then(
          (result) => result.json(),
          (err) => {
            return [];
          }
        )
        .then((result) => {
          this.suggestions.names = [
            ...[emptyValue],
            ...result.map((value) => ({
              label: value,
              value: value,
            })),
          ];
        })
        .catch((err) => {
          console.error(err.message);
          this.suggestions.names = [emptyValue];
        });
    });

    onChange = action((newValue, actionMeta) => {
      const { settingsStore } = this.props;

      settingsStore.multiGridConfig.config.gridLabel = newValue.value;
    });

    componentDidMount() {
      this.populateNameSuggestions();
    }

    render() {
      const { settingsStore } = this.props;

      return (
        <Creatable
          styles={this.context.reactSelectStyles}
          classNamePrefix="react-select"
          instanceId="configuration-grid-label"
          defaultValue={valueToOption(
            settingsStore.multiGridConfig.config.gridLabel
          )}
          options={this.suggestions.names}
          onChange={this.onChange}
        />
      );
    }
  }
);

export { GridLabelName };
