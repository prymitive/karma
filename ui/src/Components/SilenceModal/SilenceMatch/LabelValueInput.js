import React, { useEffect } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react-lite";

import { components } from "react-select";

import Creatable from "react-select/creatable";

import { FormatBackendURI } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceFormMatcher } from "Models/SilenceForm";
import { useFetchGet } from "Hooks/useFetchGet";
import { hashObject } from "Common/Hash";
import { NewLabelValue } from "Common/Select";
import { ValidationError } from "Components/ValidationError";
import { ThemeContext } from "Components/Theme";
import { MatchCounter } from "./MatchCounter";

const GenerateHashFromMatchers = (silenceFormStore, matcher) =>
  hashObject({
    alertmanagers: silenceFormStore.data.alertmanagers,
    matcher: {
      name: matcher.name,
      values: matcher.values,
      isRegex: matcher.isRegex,
    },
  });

const Placeholder = (props) => {
  return (
    <div>
      <components.Placeholder {...props} />
    </div>
  );
};

const ValueContainer = ({ children, ...props }) => (
  <components.ValueContainer {...props}>
    {props.selectProps.matcher.values.length > 0 ? (
      <MatchCounter
        key={GenerateHashFromMatchers(
          props.selectProps.silenceFormStore,
          props.selectProps.matcher
        )}
        silenceFormStore={props.selectProps.silenceFormStore}
        matcher={props.selectProps.matcher}
      />
    ) : null}
    {children}
  </components.ValueContainer>
);

const LabelValueInput = observer(({ silenceFormStore, matcher, isValid }) => {
  const { response, get, cancelGet } = useFetchGet(
    FormatBackendURI(`labelValues.json?name=${matcher.name}`),
    { autorun: false }
  );

  useEffect(() => {
    if (matcher.name) {
      get();
    }
    return () => cancelGet();
  }, [matcher.name, get, cancelGet]);

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId={`silence-input-label-value-${matcher.id}`}
      formatCreateLabel={NewLabelValue}
      defaultValue={matcher.values}
      options={
        response
          ? response.map((value) => ({
              label: value,
              value: value,
            }))
          : []
      }
      placeholder={isValid ? "Label value" : <ValidationError />}
      onChange={(newValue) => {
        const value = newValue || [];
        matcher.values = value;
        // force regex if we have multiple values
        if (value.length > 1 && matcher.isRegex === false) {
          matcher.isRegex = true;
        } else if (value.length === 1 && matcher.isRegex === true) {
          matcher.isRegex = false;
        }
      }}
      hideSelectedOptions
      isMulti
      components={{ ValueContainer, Placeholder }}
      silenceFormStore={silenceFormStore}
      matcher={matcher}
    />
  );
});
LabelValueInput.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  matcher: SilenceFormMatcher.isRequired,
  isValid: PropTypes.bool.isRequired,
};

export { LabelValueInput };
