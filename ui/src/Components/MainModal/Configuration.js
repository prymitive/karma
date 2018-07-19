import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer } from "mobx-react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

import "./Configuration.css";

const Configuration = observer(
  class Configuration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    constructor(props) {
      super(props);

      this.config = observable({
        fetchInterval: toJS(props.settingsStore.fetchConfig.interval)
      });
    }

    onChange = action(value => {
      this.config.fetchInterval = value;
    });

    onChangeComplete = action(value => {
      const { settingsStore } = this.props;

      settingsStore.setFetchInterval(value);
    });

    formatLabel(value) {
      return `${value}s`;
    }

    render() {
      return (
        <form className="px-3">
          <div className="form-group text-center">
            <label className="mb-4">Refresh interval</label>
            <InputRange
              minValue={10}
              maxValue={120}
              step={10}
              value={this.config.fetchInterval}
              id="formControlRange"
              formatLabel={this.formatLabel}
              onChange={this.onChange}
              onChangeComplete={this.onChangeComplete}
            />
          </div>
        </form>
      );
    }
  }
);

export { Configuration };
