import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { Settings } from "Stores/Settings";

const AlertGroupTitleBarColor = observer(
  class AlertGroupTitleBarColor extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    onChange = action(event => {
      const { settingsStore } = this.props;
      settingsStore.alertGroupConfig.config.colorTitleBar =
        event.target.checked;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-0">
          <div className="form-check form-check-inline">
            <span className="custom-control custom-switch">
              <input
                id="configuration-colortitlebar"
                className="custom-control-input"
                type="checkbox"
                value=""
                checked={
                  settingsStore.alertGroupConfig.config.colorTitleBar || false
                }
                onChange={this.onChange}
              />
              <label
                className="custom-control-label cursor-pointer mr-3"
                htmlFor="configuration-colortitlebar"
              >
                Color group titlebar
              </label>
            </span>
          </div>
        </div>
      );
    }
  }
);

export { AlertGroupTitleBarColor };
