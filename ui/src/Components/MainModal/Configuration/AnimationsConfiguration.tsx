import { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const AnimationsConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onChange = (value: boolean) => {
    settingsStore.themeConfig.setAnimations(value);
  };

  return (
    <div className="mb-0">
      <div className="form-check form-check-inline mx-0 px-0">
        <span className="form-check form-switch">
          <input
            id="configuration-animations"
            className="form-check-input"
            type="checkbox"
            checked={settingsStore.themeConfig.config.animations || false}
            onChange={(event) => onChange(event.target.checked)}
          />
          <label
            className="form-check-label cursor-pointer me-3"
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
