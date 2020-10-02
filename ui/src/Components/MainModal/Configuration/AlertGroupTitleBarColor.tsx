import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const AlertGroupTitleBarColor: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onChange = (value: boolean) => {
    settingsStore.alertGroupConfig.setColorTitleBar(value);
  };

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
            onChange={(event) => onChange(event.target.checked)}
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
});

export { AlertGroupTitleBarColor };
