import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const AlertGroupTitleBarColor = ({ settingsStore }) => {
  const onChange = (event) => {
    settingsStore.alertGroupConfig.config.colorTitleBar = event.target.checked;
  };

  return useObserver(() => (
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
            onChange={onChange}
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
  ));
};
AlertGroupTitleBarColor.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupTitleBarColor };
