import React, { FC, useEffect } from "react";

import { observer } from "mobx-react-lite";

import {
  ActionMeta,
  components,
  OnChangeValue,
  PlaceholderProps,
  ValueContainerProps,
} from "react-select";
import Creatable from "react-select/creatable";

import { FormatBackendURI } from "Stores/AlertStore";
import type { SilenceFormStore, MatcherWithIDT } from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { hashObject } from "Common/Hash";
import { NewLabelValue, OptionT, StringToOption } from "Common/Select";
import { ValidationError } from "Components/ValidationError";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenuMultiple } from "Components/Select";
import { MatchCounter } from "./MatchCounter";

const GenerateHashFromMatchers = (
  silenceFormStore: SilenceFormStore,
  matcher: MatcherWithIDT,
): number =>
  hashObject({
    alertmanagers: silenceFormStore.data.alertmanagers,
    matcher: {
      name: matcher.name,
      values: matcher.values,
      isRegex: matcher.isRegex,
      isEqual: matcher.isEqual,
    },
  });

const Placeholder = (props: PlaceholderProps<OptionT, true>) => (
  <div>
    <components.Placeholder {...props} />
  </div>
);

const LabelValueInput: FC<{
  silenceFormStore: SilenceFormStore;
  matcher: MatcherWithIDT;
  isValid: boolean;
}> = observer(({ silenceFormStore, matcher, isValid }) => {
  const { response, get, cancelGet } = useFetchGet<string[]>(
    FormatBackendURI(`labelValues.json?name=${matcher.name}`),
    { autorun: false },
  );

  useEffect(() => {
    if (matcher.name) {
      get();
    }
    return () => cancelGet();
  }, [matcher.name, get, cancelGet]);

  const context = React.useContext(ThemeContext);

  const ValueContainer = (props: ValueContainerProps<OptionT, true>) => (
    <components.ValueContainer
      {...(props as ValueContainerProps<OptionT, true>)}
    >
      {matcher.values.length > 0 ? (
        <MatchCounter
          key={GenerateHashFromMatchers(silenceFormStore, matcher)}
          silenceFormStore={silenceFormStore}
          matcher={matcher}
        />
      ) : null}
      {props.children}
    </components.ValueContainer>
  );

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId={`silence-input-label-value-${matcher.id}`}
      formatCreateLabel={NewLabelValue}
      defaultValue={matcher.values}
      options={
        response
          ? response.map((value: string) => StringToOption(value))
          : ([] as OptionT[])
      }
      placeholder={isValid ? "Label value" : <ValidationError />}
      onChange={(
        newValue: OnChangeValue<OptionT, true>,
        meta: ActionMeta<OptionT>,
      ) => {
        matcher.values = newValue as OptionT[];
        // force regex if we have multiple values
        if (matcher.values.length > 1 && matcher.isRegex === false) {
          matcher.isRegex = true;
        }
        if (meta.action === "create-option") {
          matcher.values[matcher.values.length - 1].wasCreated = true;
        }
      }}
      hideSelectedOptions
      isMulti
      components={{
        ValueContainer: ValueContainer,
        Placeholder: Placeholder,
        Menu: AnimatedMenuMultiple,
      }}
    />
  );
});

export { LabelValueInput };
