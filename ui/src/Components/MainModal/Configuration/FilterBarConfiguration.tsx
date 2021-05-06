import { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";

const FilterBarConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onAutohideChange = (value: boolean) => {
    settingsStore.filterBarConfig.setAutohide(value);
  };
  return (
    <div className="form-check form-check-inline px-0 mx-0">
      <span className="form-check form-switch">
        <input
          id="configuration-autohide"
          className="form-check-input"
          type="checkbox"
          checked={settingsStore.filterBarConfig.config.autohide || false}
          onChange={(event) => onAutohideChange(event.target.checked)}
        />
        <label
          className="form-check-label cursor-pointer me-3"
          htmlFor="configuration-autohide"
        >
          Hide filter bar and alert details when idle
        </label>
      </span>
    </div>
  );
});

export { FilterBarConfiguration };
