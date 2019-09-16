import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { Settings } from "Stores/Settings";

const FilterBarConfiguration = observer(
  class FilterBarConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    onAutohideChange = action(event => {
      const { settingsStore } = this.props;
      settingsStore.filterBarConfig.config.autohide = event.target.checked;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-0">
          <div className="form-check form-check-inline">
            <span className="custom-control custom-switch">
              <input
                id="configuration-autohide"
                className="custom-control-input"
                type="checkbox"
                value=""
                checked={settingsStore.filterBarConfig.config.autohide || false}
                onChange={this.onAutohideChange}
              />
              <label
                className="custom-control-label cursor-pointer mr-3"
                htmlFor="configuration-autohide"
              >
                Hide filter bar when idle
              </label>
            </span>
          </div>
        </div>
      );
    }
  }
);

export { FilterBarConfiguration };
