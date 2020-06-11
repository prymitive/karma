import React from "react";
import PropTypes from "prop-types";

import Creatable from "react-select/creatable";

import { SilenceFormMatcher } from "Models/SilenceForm";
import { FormatBackendURI } from "Stores/AlertStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { ValidationError } from "Components/ValidationError";
import { ThemeContext } from "Components/Theme";
import { NewLabelName } from "Common/Select";

const LabelNameInput = ({ matcher, isValid }) => {
  const { response } = useFetchGet(FormatBackendURI(`labelNames.json`));

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId={`silence-input-label-name-${matcher.id}`}
      formatCreateLabel={NewLabelName}
      defaultValue={
        matcher.name ? { label: matcher.name, value: matcher.name } : null
      }
      options={
        response
          ? response.map((value) => ({
              label: value,
              value: value,
            }))
          : []
      }
      placeholder={isValid ? "Label name" : <ValidationError />}
      onChange={({ value }) => {
        matcher.name = value;
      }}
      hideSelectedOptions
    />
  );
};
LabelNameInput.propTypes = {
  matcher: SilenceFormMatcher.isRequired,
  isValid: PropTypes.bool.isRequired,
};

export { LabelNameInput };
