import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const FilterBarConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const onAutohideChange = (value: boolean) => {
    settingsStore.filterBarConfig.config.autohide = value;
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
            onChange={(event) => onAutohideChange(event.target.checked)}
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

export { FilterBarConfiguration };
