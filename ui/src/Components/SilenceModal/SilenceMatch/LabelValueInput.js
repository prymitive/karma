import React from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { components } from "react-select";

import { SilenceFormMatcher } from "Models/SilenceForm";
import { MultiSelect } from "Components/MultiSelect";
import { ValidationError } from "Components/MultiSelect/ValidationError";
import { MatchCounter } from "./MatchCounter";

const Placeholder = props => {
  return (
    <div>
      <components.Placeholder {...props} />
    </div>
  );
};

const ValueContainer = ({ children, ...props }) => (
  <components.ValueContainer {...props}>
    <MatchCounter matcher={props.selectProps.matcher} />
    {children}
  </components.ValueContainer>
);

const LabelValueInput = observer(
  class LabelValueInput extends MultiSelect {
    static propTypes = {
      matcher: SilenceFormMatcher.isRequired,
      isValid: PropTypes.bool.isRequired
    };

    onChange = action((newValue, actionMeta) => {
      const { matcher } = this.props;

      matcher.values = newValue;

      // force regex if we have multiple values
      if (newValue.length > 1 && matcher.isRegex === false) {
        matcher.isRegex = true;
      } else if (newValue.length === 1 && matcher.isRegex === true) {
        matcher.isRegex = false;
      }
    });

    renderProps = () => {
      const { matcher, isValid } = this.props;

      return {
        instanceId: `silence-input-label-value-${matcher.id}`,
        defaultValue: matcher.values,
        options: matcher.suggestions.values,
        placeholder: isValid ? "Label value" : <ValidationError />,
        isMulti: true,
        onChange: this.onChange,
        components: { ValueContainer, Placeholder },
        matcher: matcher
      };
    };
  }
);

export { LabelValueInput };
