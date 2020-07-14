import React, { FC, useState } from "react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const FetchConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [fetchInterval, setFetchInterval] = useState(
    settingsStore.fetchConfig.config.interval
  );

  const onChangeComplete = (value: number) => {
    settingsStore.fetchConfig.setInterval(value);
  };

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={10}
        maxValue={120}
        step={10}
        value={fetchInterval}
        formatLabel={(value) => `${value}s`}
        onChange={(value) => setFetchInterval(value as number)}
        onChangeComplete={(value) => onChangeComplete(value as number)}
      />
    </div>
  );
};

export { FetchConfiguration };
