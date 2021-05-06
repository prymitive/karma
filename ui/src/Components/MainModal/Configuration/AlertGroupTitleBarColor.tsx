import { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const AlertGroupTitleBarColor: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onChange = (value: boolean) => {
    settingsStore.alertGroupConfig.setColorTitleBar(value);
  };

  return (
    <div className="mb-0">
      <div className="form-check form-check-inline mx-0 px-0">
        <span className="form-check form-switch">
          <input
            id="configuration-colortitlebar"
            className="form-check-input"
            type="checkbox"
            checked={
              settingsStore.alertGroupConfig.config.colorTitleBar || false
            }
            onChange={(event) => onChange(event.target.checked)}
          />
          <label
            className="form-check-label cursor-pointer me-3"
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
