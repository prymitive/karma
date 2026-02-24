import { FC, useState } from "react";

import debounce from "lodash.debounce";

import { Range } from "react-range";

import type { Settings } from "Stores/Settings";

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
        label=""
        step={10}
        min={300}
        max={800}
        values={groupWidth}
        onChange={(values) => setGroupWidth(values)}
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
              {groupWidth}
            </div>
          );
        }}
      />
    </div>
  );
};

export { AlertGroupWidthConfiguration };
