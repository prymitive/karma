import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer } from "mobx-react";

import debounce from "lodash/debounce";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupWidthConfiguration = observer(
  class AlertGroupWidthConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    constructor(props) {
      super(props);

      this.config = observable({
        groupWidth: toJS(props.settingsStore.gridConfig.config.groupWidth)
      });
    }

    onChange = action(value => {
      this.config.groupWidth = value;
    });

    onChangeComplete = debounce(
      action(value => {
        const { settingsStore } = this.props;

        settingsStore.gridConfig.config.groupWidth = value;
      }),
      200
    );

    render() {
      return (
        <div className="form-group mb-0 text-center">
          <InputRange
            minValue={300}
            maxValue={800}
            step={20}
            value={this.config.groupWidth}
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

export { AlertGroupWidthConfiguration };
