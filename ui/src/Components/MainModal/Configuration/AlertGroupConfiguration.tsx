import React, { FC, useState } from "react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [defaultRenderCount, setDefaultRenderCount] = useState<number>(
    settingsStore.alertGroupConfig.config.defaultRenderCount
  );

  const onChangeComplete = (value: number) => {
    settingsStore.alertGroupConfig.setDefaultRenderCount(value as number);
  };

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={1}
        maxValue={10}
        step={1}
        value={defaultRenderCount}
        onChange={(value) => setDefaultRenderCount(value as number)}
        onChangeComplete={(value) => onChangeComplete(value as number)}
      />
    </div>
  );
};

export { AlertGroupConfiguration };
