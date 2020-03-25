import React from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import Creatable from "react-select/creatable";

import { StaticLabels } from "Common/Query";
import { FetchGet } from "Common/Fetch";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const valueToOption = (v) => ({ label: v, value: v });

const SortLabelName = observer(
  class SortLabelName extends Creatable {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };
    static contextType = ThemeContext;

    constructor(props) {
      super(props);

      if (!props.settingsStore.gridConfig.config.sortLabel) {
        props.settingsStore.gridConfig.config.sortLabel =
          StaticLabels.AlertName;
      }
    }

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
          this.suggestions.names = result.map((value) => ({
            label: value,
            value: value,
          }));
        })
        .catch((err) => {
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
        <Creatable
          styles={this.context.reactSelectStyles}
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
