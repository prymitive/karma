import { use, FC } from "react";

import { action } from "mobx";

import Creatable from "react-select/creatable";

import { FormatBackendURI } from "Stores/AlertStore";
import type { MatcherWithIDT } from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { ValidationError } from "Components/ValidationError";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenu } from "Components/Select";
import { NewLabelName, OptionT, StringToOption } from "Common/Select";
import { OnChangeValue } from "react-select";

const setMatcherName = action(
  (matcher: MatcherWithIDT, option: OnChangeValue<OptionT, false>) => {
    matcher.name = (option as OptionT).value;
  },
);

const LabelNameInput: FC<{
  matcher: MatcherWithIDT;
  isValid: boolean;
}> = ({ matcher, isValid }) => {
  const { response } = useFetchGet<string[]>(
    FormatBackendURI(`labelNames.json`),
  );

  const context = use(ThemeContext);

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
      onChange={(option: OnChangeValue<OptionT, false>) =>
        setMatcherName(matcher, option)
      }
      hideSelectedOptions
      components={{ Menu: AnimatedMenu }}
    />
  );
};

export { LabelNameInput };
