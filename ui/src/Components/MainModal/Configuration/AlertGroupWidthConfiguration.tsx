import { FC, useState } from "react";

import debounce from "lodash.debounce";

import { Range } from "react-range";

import { Settings } from "Stores/Settings";

const AlertGroupWidthConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [groupWidth, setGroupWidth] = useState<number[]>([
    settingsStore.gridConfig.config.groupWidth,
  ]);

  const onChangeComplete = debounce((value: number) => {
    settingsStore.gridConfig.setGroupWidth(value);
  }, 200);

  return (
    <div className="p-3 text-center">
      <Range
        step={10}
        min={300}
        max={800}
        values={groupWidth}
        onChange={(values) => setGroupWidth(values)}
        onFinalChange={(values) => onChangeComplete(values[0])}
        renderTrack={({ props, children }) => (
          <div className="input-range-track" {...props}>
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div className="input-range-thumb" {...props}>
            {groupWidth}
          </div>
        )}
      />
    </div>
  );
};

export { AlertGroupWidthConfiguration };
