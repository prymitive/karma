import { FC, useState } from "react";

import { Range } from "react-range";

import { Settings } from "Stores/Settings";

const AlertGroupConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [defaultRenderCount, setDefaultRenderCount] = useState<number[]>([
    settingsStore.alertGroupConfig.config.defaultRenderCount,
  ]);

  const onChangeComplete = (value: number) => {
    settingsStore.alertGroupConfig.setDefaultRenderCount(value as number);
  };

  return (
    <div className="p-3 text-center">
      <Range
        step={1}
        min={1}
        max={10}
        values={defaultRenderCount}
        onChange={(values) => setDefaultRenderCount(values)}
        onFinalChange={(values) => onChangeComplete(values[0])}
        renderTrack={({ props, children }) => (
          <div className="input-range-track" {...props}>
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div className="input-range-thumb" {...props}>
            {defaultRenderCount}
          </div>
        )}
      />
    </div>
  );
};

export { AlertGroupConfiguration };
