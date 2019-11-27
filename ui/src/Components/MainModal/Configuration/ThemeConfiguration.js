import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { Settings } from "Stores/Settings";

const ThemeConfiguration = observer(
  class ThemeConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    onChange = action(event => {
      const { settingsStore } = this.props;
      settingsStore.themeConfig.config.darkTheme = event.target.checked;

      document.body.classList.toggle(
        "theme-dark",
        settingsStore.themeConfig.config.darkTheme
      );
      document.body.classList.toggle(
        "theme-light",
        !settingsStore.themeConfig.config.darkTheme
      );
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-0">
          <div className="form-check form-check-inline">
            <span className="custom-control custom-switch">
              <input
                id="configuration-theme"
                className="custom-control-input"
                type="checkbox"
                value=""
                checked={settingsStore.themeConfig.config.darkTheme || false}
                onChange={this.onChange}
              />
              <label
                className="custom-control-label cursor-pointer mr-3"
                htmlFor="configuration-theme"
              >
                Enable dark mode
              </label>
              <span className="ml-5 badge badge-danger align-text-bottom">
                Experimental
              </span>
            </span>
          </div>
        </div>
      );
    }
  }
);

export { ThemeConfiguration };
