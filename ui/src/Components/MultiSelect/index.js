import React from "react";

import CreatableSelect from "react-select/lib/Creatable";

const ReactSelectStyles = {
  control: (base, state) =>
    state.isFocused
      ? {
          ...base,
          outline: "0",
          outlineOffset: "-2px",
          boxShadow: "0 0 0 0.2rem rgba(69, 90, 100, 0.25)",
          borderRadius: "0.25rem",
          borderColor: "#819ba8",
          "&:hover": {
            borderColor: "#819ba8"
          }
        }
      : {
          ...base,
          borderRadius: "0.25rem",
          borderColor: "#ced4da",
          "&:hover": { borderColor: "#ced4da" }
        },
  valueContainer: (base, state) =>
    state.isMulti
      ? {
          ...base,
          borderRadius: "0.25rem",
          backgroundColor: "#fff",
          paddingLeft: "4px",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          maxWidth: "100%",
          overflow: "hidden"
        }
      : {
          ...base,
          borderRadius: "0.25rem",
          backgroundColor: "#fff"
        },
  multiValue: (base, state) => ({
    ...base,
    borderRadius: "4px",
    backgroundColor: "#455a64",
    "&:hover": {
      backgroundColor: "#455a64"
    }
  }),
  multiValueLabel: (base, state) => ({
    ...base,
    color: "#fff",
    whiteSpace: "normal",
    wordWrap: "break-word",
    "&:hover": {
      color: "#fff"
    }
  }),
  multiValueRemove: (base, state) => ({
    ...base,
    cursor: "pointer",
    color: "#fff",
    backgroundColor: "inherit",
    opacity: "0.4",
    "&:hover": {
      color: "#fff",
      backgroundColor: "inherit",
      opacity: "0.75"
    }
  }),
  indicatorsContainer: (base, state) => ({
    ...base,
    backgroundColor: "#fff",
    borderTopRightRadius: "0.25rem",
    borderBottomRightRadius: "0.25rem"
  }),
  option: (base, state) => ({
    ...base,
    color: "inherit",
    backgroundColor: "inherit",
    "&:hover": { color: "#fff", backgroundColor: "#455a64", cursor: "pointer" }
  })
};

class MultiSelect extends CreatableSelect {
  renderProps = () => ({});

  render() {
    return (
      <CreatableSelect styles={ReactSelectStyles} {...this.renderProps()} />
    );
  }
}

export { MultiSelect, ReactSelectStyles };
