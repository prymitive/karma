import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const AnimationsConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onChange = (value: boolean) => {
    settingsStore.themeConfig.setAnimations(value);
  };

  return (
    <div className="form-group mb-0">
      <div className="form-check form-check-inline">
        <span className="custom-control custom-switch">
          <input
            id="configuration-animations"
            className="custom-control-input"
            type="checkbox"
            value=""
            checked={settingsStore.themeConfig.config.animations || false}
            onChange={(event) => onChange(event.target.checked)}
          />
          <label
            className="custom-control-label cursor-pointer mr-3"
            htmlFor="configuration-animations"
          >
            Enable animations
          </label>
        </span>
      </div>
    </div>
  );
});

export { AnimationsConfiguration };
