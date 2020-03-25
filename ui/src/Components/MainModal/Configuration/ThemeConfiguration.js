import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import Select from "react-select";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const ThemeConfiguration = observer(
  class ThemeConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };
    static contextType = ThemeContext;

    constructor(props) {
      super(props);

      this.validateConfig();
    }

    valueToOption = (val) => {
      const { settingsStore } = this.props;

      return {
        label: settingsStore.themeConfig.options[val].label,
        value: val,
      };
    };

    validateConfig = action(() => {
      const { settingsStore } = this.props;

      if (
        !Object.values(settingsStore.themeConfig.options)
          .map((o) => o.value)
          .includes(settingsStore.themeConfig.config.theme)
      ) {
        settingsStore.themeConfig.config.theme =
          settingsStore.themeConfig.options.auto.value;
      }
    });

    onCollapseChange = action((newValue, actionMeta) => {
      const { settingsStore } = this.props;

      settingsStore.themeConfig.config.theme = newValue.value;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-2">
          <Select
            styles={this.context.reactSelectStyles}
            classNamePrefix="react-select"
            instanceId="configuration-theme"
            defaultValue={this.valueToOption(
              settingsStore.themeConfig.config.theme
            )}
            options={Object.values(settingsStore.themeConfig.options)}
            onChange={this.onCollapseChange}
            hideSelectedOptions
          />
        </div>
      );
    }
  }
);

export { ThemeConfiguration };
