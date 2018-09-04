import React from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { MultiSelect } from "Components/MultiSelect";
import { ValidationError } from "Components/MultiSelect/ValidationError";
import { FormatUnseeBackendURI } from "Stores/AlertStore";

const LabelNameInput = observer(
  class LabelNameInput extends MultiSelect {
    static propTypes = {
      matcher: PropTypes.object.isRequired,
      isValid: PropTypes.bool.isRequired
    };

    populateNameSuggestions = action(() => {
      const { matcher } = this.props;

      fetch(FormatUnseeBackendURI(`labelNames.json`))
        .then(
          result => result.json(),
          err => {
            return [];
          }
        )
        .then(result => {
          matcher.suggestions.names = result.map(value => ({
            label: value,
            value: value
          }));
        })
        .catch(err => console.error(err.message));
    });

    populateValueSuggestions = action(() => {
      const { matcher } = this.props;

      fetch(FormatUnseeBackendURI(`labelValues.json?name=${matcher.name}`))
        .then(
          result => result.json(),
          err => {
            return [];
          }
        )
        .then(result => {
          matcher.suggestions.values = result.map(value => ({
            label: value,
            value: value
          }));
        })
        .catch(err => console.error(err.message));
    });

    onChange = action((newValue, actionMeta) => {
      const { matcher } = this.props;

      matcher.name = newValue.value;

      if (newValue) {
        this.populateValueSuggestions();
      }
    });

    componentDidMount() {
      const { matcher } = this.props;

      this.populateNameSuggestions();
      if (matcher.name) {
        this.populateValueSuggestions();
      }
    }

    renderProps = () => {
      const { matcher, isValid } = this.props;

      const value = matcher.name
        ? { label: matcher.name, value: matcher.name }
        : null;

      return {
        instanceId: `silence-input-label-name-${matcher.id}`,
        defaultValue: value,
        options: matcher.suggestions.names,
        placeholder: isValid ? "Label name" : <ValidationError />,
        onChange: this.onChange
      };
    };
  }
);

export { LabelNameInput };
