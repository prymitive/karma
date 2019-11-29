import React from "react";

import Creatable from "react-select/creatable";

import { ThemeContext } from "Components/Theme";

class MultiSelect extends Creatable {
  renderProps = () => ({});

  render() {
    return (
      <Creatable
        styles={this.context.reactSelectStyles}
        classNamePrefix="react-select"
        {...this.renderProps()}
      />
    );
  }
}
MultiSelect.contextType = ThemeContext;

export { MultiSelect };
