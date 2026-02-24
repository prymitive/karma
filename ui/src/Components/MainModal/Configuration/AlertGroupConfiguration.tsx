import { FC, useState } from "react";

import { Range } from "react-range";

import type { Settings } from "Stores/Settings";

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
        label=""
        step={1}
        min={1}
        max={25}
        values={defaultRenderCount}
        onChange={(values) => setDefaultRenderCount(values)}
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
              {defaultRenderCount}
            </div>
          );
        }}
      />
    </div>
  );
};

export { AlertGroupConfiguration };
