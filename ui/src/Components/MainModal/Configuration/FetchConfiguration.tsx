import { FC, useState } from "react";

import { Range } from "react-range";

import type { Settings } from "Stores/Settings";

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
        label=""
        step={10}
        min={10}
        max={120}
        values={fetchInterval}
        onChange={(values) => setFetchInterval(values)}
        onFinalChange={(values) => onChangeComplete(values[0])}
        renderTrack={({ props, children }) => {
          const { key, ...restProps } = props as typeof props & {
            key?: string;
          };
          return (
            <div key={key} className="input-range-track" {...restProps}>
              {children}
            </div>
          );
        }}
        renderThumb={({ props }) => {
          const { key, ...restProps } = props as typeof props & {
            key?: string;
          };
          return (
            <div key={key} className="input-range-thumb" {...restProps}>
              {fetchInterval}s
            </div>
          );
        }}
      />
    </div>
  );
};

export { FetchConfiguration };
