import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import Select from "react-select";

import { Settings } from "Stores/Settings";
import { ReactSelectStyles } from "Components/MultiSelect";

const AlertGroupCollapseConfiguration = observer(
  class AlertGroupCollapseConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    constructor(props) {
      super(props);

      this.validateConfig();
    }

    valueToOption = val => {
      const { settingsStore } = this.props;

      return {
        label: settingsStore.alertGroupConfig.options[val].label,
        value: val
      };
    };

    validateConfig = action(() => {
      const { settingsStore } = this.props;

      if (
        !Object.values(settingsStore.alertGroupConfig.options)
          .map(o => o.value)
          .includes(settingsStore.alertGroupConfig.config.defaultCollapseState)
      ) {
        settingsStore.alertGroupConfig.config.defaultCollapseState =
          settingsStore.alertGroupConfig.options.collapsedOnMobile.value;
      }
    });

    onCollapseChange = action((newValue, actionMeta) => {
      const { settingsStore } = this.props;

      settingsStore.alertGroupConfig.config.defaultCollapseState =
        newValue.value;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-0">
          <Select
            styles={ReactSelectStyles}
            classNamePrefix="react-select"
            instanceId="configuration-collapse"
            defaultValue={this.valueToOption(
              settingsStore.alertGroupConfig.config.defaultCollapseState
            )}
            options={Object.values(settingsStore.alertGroupConfig.options)}
            onChange={this.onCollapseChange}
            hideSelectedOptions
          />
        </div>
      );
    }
  }
);

export { AlertGroupCollapseConfiguration };
