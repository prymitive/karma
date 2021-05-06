import { FC, useState } from "react";

import { Range } from "react-range";

import { Settings } from "Stores/Settings";

const FetchConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const [fetchInterval, setFetchInterval] = useState<number[]>([
    settingsStore.fetchConfig.config.interval,
  ]);

  const onChangeComplete = (value: number) => {
    settingsStore.fetchConfig.setInterval(value);
  };

  return (
    <div className="p-3 text-center">
      <Range
        step={10}
        min={10}
        max={120}
        values={fetchInterval}
        onChange={(values) => setFetchInterval(values)}
        onFinalChange={(values) => onChangeComplete(values[0])}
        renderTrack={({ props, children }) => (
          <div className="input-range-track" {...props}>
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div className="input-range-thumb" {...props}>
            {fetchInterval}s
          </div>
        )}
      />
    </div>
  );
};

export { FetchConfiguration };
