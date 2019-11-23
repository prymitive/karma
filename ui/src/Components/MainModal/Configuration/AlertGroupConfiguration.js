import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer } from "mobx-react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupConfiguration = observer(
  class AlertGroupConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    constructor(props) {
      super(props);

      this.config = observable({
        defaultRenderCount: toJS(
          props.settingsStore.alertGroupConfig.config.defaultRenderCount
        )
      });
    }

    onChange = action(value => {
      this.config.defaultRenderCount = value;
    });

    onChangeComplete = action(value => {
      const { settingsStore } = this.props;

      settingsStore.alertGroupConfig.update({ defaultRenderCount: value });
    });

    render() {
      return (
        <div className="form-group mb-0 text-center">
          <InputRange
            minValue={1}
            maxValue={10}
            step={1}
            value={this.config.defaultRenderCount}
            id="formControlRange"
            formatLabel={this.formatLabel}
            onChange={this.onChange}
            onChangeComplete={this.onChangeComplete}
          />
        </div>
      );
    }
  }
);

export { AlertGroupConfiguration };
