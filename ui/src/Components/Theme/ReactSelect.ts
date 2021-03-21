import { CSSObject } from "@emotion/serialize";
import {
  ControlProps,
  IndicatorContainerProps,
  OptionTypeBase,
  SingleValueProps,
  Styles,
  ValueContainerProps,
} from "react-select";

interface ReactSelectTheme {
  color: string;
  singleValueColor: string;
  backgroundColor: string;
  borderColor: string;
  focusedBoxShadow: string;
  focusedBorderColor: string;
  menuBackground: string;
  optionHoverBackground: string;
  valueContainerBackground: string;
  disabledValueContainerBackground: string;
}

interface ReactSelectThemes {
  Light: ReactSelectTheme;
  Dark: ReactSelectTheme;
}

const ReactSelectColors: ReactSelectThemes = {
  Light: {
    color: "#fff",
    singleValueColor: "#000",
    backgroundColor: "#fff",
    borderColor: "#ced4da",
    focusedBoxShadow: "rgba(69, 90, 100, 0.25)",
    focusedBorderColor: "#819ba8",
    menuBackground: "#fff",
    optionHoverBackground: "#455a64",
    valueContainerBackground: "#fff",
    disabledValueContainerBackground: "#ecf0f1",
  },
  Dark: {
    color: "#fff",
    singleValueColor: "#fff",
    backgroundColor: "#fff",
    borderColor: "#444",
    focusedBoxShadow: "rgba(69, 90, 100, 0.25)",
    focusedBorderColor: "#819ba8",
    menuBackground: "#2b2b2b",
    optionHoverBackground: "#455a64",
    valueContainerBackground: "#444",
    disabledValueContainerBackground: "#303030",
  },
};

interface StateFnT {
  isFocused: boolean;
  isMulti: boolean;
  isDisabled: boolean;
}

const ReactSelectStyles = <
  OptionType extends OptionTypeBase,
  IsMulti extends boolean
>(
  theme: ReactSelectTheme
): Styles<OptionType, IsMulti> => ({
  control: (base: CSSObject, props: ControlProps<OptionType, IsMulti>) =>
    props.isFocused
      ? {
          ...base,
          backgroundColor: props.isDisabled
            ? theme.disabledValueContainerBackground
            : theme.valueContainerBackground,
          outline: "0",
          outlineOffset: "-2px",
          boxShadow: `0 0 0 0.2rem ${theme.focusedBoxShadow}`,
          borderRadius: "0.25rem",
          borderColor: theme.focusedBorderColor,
          "&:hover": {
            borderColor: theme.focusedBorderColor,
          },
        }
      : {
          ...base,
          backgroundColor: props.isDisabled
            ? theme.disabledValueContainerBackground
            : theme.valueContainerBackground,
          borderRadius: "0.25rem",
          borderColor: theme.borderColor,
          "&:hover": { borderColor: theme.borderColor },
        },
  valueContainer: (
    base: CSSObject,
    props: ValueContainerProps<OptionType, IsMulti>
  ) =>
    props.isMulti
      ? {
          ...base,
          borderTopLeftRadius: "0.25rem",
          borderBottomLeftRadius: "0.25rem",
          paddingLeft: "4px",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          maxWidth: "100%",
          overflow: "hidden",
        }
      : {
          ...base,
          borderTopLeftRadius: "0.25rem",
          borderBottomLeftRadius: "0.25rem",
        },
  singleValue: (base: CSSObject, props: SingleValueProps<OptionType>) => ({
    ...base,
    color: theme.singleValueColor,
  }),
  multiValue: (base: CSSObject) => ({
    ...base,
    borderRadius: "4px",
    backgroundColor: theme.optionHoverBackground,
    "&:hover": {
      backgroundColor: theme.optionHoverBackground,
    },
  }),
  multiValueLabel: (base: CSSObject) => ({
    ...base,
    color: theme.color,
    whiteSpace: "normal",
    wordWrap: "break-word",
    wordBreak: "break-word",
    "&:hover": {
      color: theme.color,
    },
  }),
  multiValueRemove: (base: CSSObject) => ({
    ...base,
    cursor: "pointer",
    color: theme.color,
    backgroundColor: "inherit",
    opacity: "0.4",
    borderRadius: "inherit",
    "&:hover": {
      color: theme.color,
      backgroundColor: "inherit",
      opacity: "0.75",
    },
  }),
  input: (base: CSSObject) => ({
    ...base,
    color: "inherit",
  }),
  indicatorsContainer: (
    base: CSSObject,
    props: IndicatorContainerProps<OptionType, IsMulti>
  ) => ({
    ...base,
    backgroundColor: props.isDisabled
      ? theme.disabledValueContainerBackground
      : theme.valueContainerBackground,
    borderTopRightRadius: "0.25rem",
    borderBottomRightRadius: "0.25rem",
  }),
  dropdownIndicator: (base: CSSObject, state: StateFnT) =>
    state.isFocused
      ? {
          ...base,
          "&:hover": { color: "inherit" },
        }
      : { ...base },
  menu: (base: CSSObject) => ({
    ...base,
    zIndex: 1500,
    backgroundColor: theme.menuBackground,
  }),
  option: (base: CSSObject) => ({
    ...base,
    color: "inherit",
    backgroundColor: "inherit",
    "&:hover": {
      color: theme.color,
      backgroundColor: theme.optionHoverBackground,
      cursor: "pointer",
    },
  }),
});

export { ReactSelectStyles, ReactSelectColors };
