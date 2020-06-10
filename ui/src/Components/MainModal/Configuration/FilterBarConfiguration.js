import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const FilterBarConfiguration = ({ settingsStore }) => {
  const onAutohideChange = (event) => {
    settingsStore.filterBarConfig.config.autohide = event.target.checked;
  };
  return useObserver(() => (
    <div className="form-group mb-0">
      <div className="form-check form-check-inline">
        <span className="custom-control custom-switch">
          <input
            id="configuration-autohide"
            className="custom-control-input"
            type="checkbox"
            value=""
            checked={settingsStore.filterBarConfig.config.autohide || false}
            onChange={onAutohideChange}
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
  ));
};
FilterBarConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { FilterBarConfiguration };
