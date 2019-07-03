import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer } from "mobx-react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

import "./InputRange.scss";

const TopLabelsConfiguration = observer(
  class TopLabelsConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    constructor(props) {
      super(props);

      this.config = observable({
        minPercent: toJS(props.settingsStore.topLabelsConfig.config.minPercent)
      });
    }

    onChangePercentStart = action(value => {
      this.config.minPercent = value;
    });

    onChangePercentComplete = action(value => {
      const { settingsStore } = this.props;

      settingsStore.topLabelsConfig.config.minPercent = value;
    });

    formatLabel = value => {
      return `${value}%`;
    };

    onChangeShow = action(event => {
      const { settingsStore } = this.props;
      settingsStore.topLabelsConfig.config.show = event.target.checked;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group">
          <div className="text-center">
            <label className="mb-4 font-weight-bold">
              Top labels threshold
            </label>
          </div>
          <div className="mb-4">
            <InputRange
              minValue={0}
              maxValue={99}
              step={1}
              value={this.config.minPercent}
              id="topLabelsConfigMinPercent"
              formatLabel={this.formatLabel}
              onChange={this.onChangePercentStart}
              onChangeComplete={this.onChangePercentComplete}
            />
          </div>
          <div className="form-check form-check-inline">
            <span className="custom-control custom-switch">
              <input
                id="topLabelsConfigShow"
                className="custom-control-input"
                type="checkbox"
                value=""
                checked={settingsStore.topLabelsConfig.config.show || false}
                onChange={this.onChangeShow}
              />
              <label
                className="custom-control-label cursor-pointer mr-3"
                htmlFor="topLabelsConfigShow"
              >
                Show top labels
              </label>
            </span>
          </div>
        </div>
      );
    }
  }
);

export { TopLabelsConfiguration };
