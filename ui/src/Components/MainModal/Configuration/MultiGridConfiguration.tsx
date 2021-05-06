import { FC } from "react";

import { observer } from "mobx-react-lite";

import { Settings } from "Stores/Settings";
import { GridLabelName } from "./GridLabelName";

const MultiGridConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const onSortReverseChange = (value: boolean) => {
    settingsStore.multiGridConfig.setGridSortReverse(value);
  };

  return (
    <div className="mb-0">
      <div className="d-flex flex-fill flex-lg-row flex-column justify-content-between">
        <div className="flex-shrink-0 flex-grow-1 flex-basis-auto mx-0 mx-lg-1 mt-1 mt-lg-0">
          <GridLabelName settingsStore={settingsStore} />
        </div>
        <div className="flex-shrink-1 flex-grow-0 form-check form-check-inline flex-basis-auto my-1 my-lg-auto ms-0 ms-lg-2 me-0 px-0">
          <span className="form-check form-switch">
            <input
              id="configuration-multigrid-sort-reverse"
              className="form-check-input"
              type="checkbox"
              checked={
                settingsStore.multiGridConfig.config.gridSortReverse || false
              }
              onChange={(event) => onSortReverseChange(event.target.checked)}
            />
            <label
              className="form-check-label cursor-pointer"
              htmlFor="configuration-multigrid-sort-reverse"
            >
              Reverse order
            </label>
          </span>
        </div>
      </div>
    </div>
  );
});

export { MultiGridConfiguration };
