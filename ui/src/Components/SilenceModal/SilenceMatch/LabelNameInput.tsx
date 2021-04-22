import React, { FC } from "react";

import Creatable from "react-select/creatable";

import { FormatBackendURI } from "Stores/AlertStore";
import { MatcherWithIDT } from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { ValidationError } from "Components/ValidationError";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenu } from "Components/Select";
import { NewLabelName, OptionT, StringToOption } from "Common/Select";

const LabelNameInput: FC<{
  matcher: MatcherWithIDT;
  isValid: boolean;
}> = ({ matcher, isValid }) => {
  const { response } = useFetchGet<string[]>(
    FormatBackendURI(`labelNames.json`)
  );

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId={`silence-input-label-name-${matcher.id}`}
      formatCreateLabel={NewLabelName}
      defaultValue={matcher.name ? StringToOption(matcher.name) : null}
      options={
        response ? response.map((value: string) => StringToOption(value)) : []
      }
      placeholder={isValid ? "Label name" : <ValidationError />}
      onChange={(option) => {
        matcher.name = (option as OptionT).value;
      }}
      hideSelectedOptions
      components={{ Menu: AnimatedMenu }}
    />
  );
};

export { LabelNameInput };
