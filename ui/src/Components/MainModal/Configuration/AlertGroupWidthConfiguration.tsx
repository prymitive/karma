import React, { FC, useState } from "react";

import debounce from "lodash.debounce";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupWidthConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [groupWidth, setGroupWidth] = useState<number>(
    settingsStore.gridConfig.config.groupWidth
  );

  const onChangeComplete = debounce((value: number) => {
    settingsStore.gridConfig.config.groupWidth = value as number;
  }, 200);

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={300}
        maxValue={800}
        step={20}
        value={groupWidth}
        onChange={(value) => setGroupWidth(value as number)}
        onChangeComplete={(value) => onChangeComplete(value as number)}
      />
    </div>
  );
};

export { AlertGroupWidthConfiguration };
