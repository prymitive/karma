import { CSSProperties } from "react";
import { Styles } from "react-select";

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

const ReactSelectStyles = (theme: ReactSelectTheme): Styles => ({
  control: (base: CSSProperties, state: any) =>
    state.isFocused
      ? {
          ...base,
          backgroundColor: theme.backgroundColor,
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
          backgroundColor: "inherit",
          borderRadius: "0.25rem",
          borderColor: theme.borderColor,
          "&:hover": { borderColor: theme.borderColor },
        },
  valueContainer: (base: CSSProperties, state: any) =>
    state.isMulti
      ? {
          ...base,
          borderTopLeftRadius: "0.25rem",
          borderBottomLeftRadius: "0.25rem",
          backgroundColor: state.isDisabled
            ? theme.disabledValueContainerBackground
            : theme.valueContainerBackground,
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
          backgroundColor: state.isDisabled
            ? theme.disabledValueContainerBackground
            : theme.valueContainerBackground,
        },
  singleValue: (base: CSSProperties) => ({
    ...base,
    color: theme.singleValueColor,
  }),
  multiValue: (base: CSSProperties) => ({
    ...base,
    borderRadius: "4px",
    backgroundColor: theme.optionHoverBackground,
    "&:hover": {
      backgroundColor: theme.optionHoverBackground,
    },
  }),
  multiValueLabel: (base: CSSProperties) => ({
    ...base,
    color: theme.color,
    whiteSpace: "normal",
    wordWrap: "break-word",
    wordBreak: "break-word",
    "&:hover": {
      color: theme.color,
    },
  }),
  multiValueRemove: (base: CSSProperties) => ({
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
  input: (base: CSSProperties) => ({
    ...base,
    color: "inherit",
  }),
  indicatorsContainer: (base: CSSProperties, state: any) => ({
    ...base,
    backgroundColor: state.isDisabled
      ? theme.disabledValueContainerBackground
      : theme.valueContainerBackground,
    borderTopRightRadius: "0.25rem",
    borderBottomRightRadius: "0.25rem",
  }),
  dropdownIndicator: (base: CSSProperties, state: any) =>
    state.isFocused
      ? {
          ...base,
          "&:hover": { color: "inherit" },
        }
      : { ...base },
  menu: (base: CSSProperties) => ({
    ...base,
    zIndex: 1500,
    backgroundColor: theme.menuBackground,
  }),
  option: (base: CSSProperties) => ({
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
