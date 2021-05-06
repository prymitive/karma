import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import Select from "react-select";

import { Settings, SortOrderT } from "Stores/Settings";
import { OptionT } from "Common/Select";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenu } from "Components/Select";
import { SortLabelName } from "./SortLabelName";

const AlertGroupSortConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  if (
    !Object.values(settingsStore.gridConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.gridConfig.config.sortOrder)
  ) {
    settingsStore.gridConfig.setSortOrder("default");
  }

  const onSortOrderChange = (value: SortOrderT) => {
    settingsStore.gridConfig.setSortOrder(value);
  };

  const onSortReverseChange = (value: boolean) => {
    settingsStore.gridConfig.setSortReverse(value);
  };

  const valueToOption = (val: SortOrderT) => {
    return { label: settingsStore.gridConfig.options[val].label, value: val };
  };

  const hideReverse =
    settingsStore.gridConfig.config.sortOrder ===
      settingsStore.gridConfig.options.default.value ||
    settingsStore.gridConfig.config.sortOrder ===
      settingsStore.gridConfig.options.disabled.value;

  const context = React.useContext(ThemeContext);

  return (
    <div className="mb-0">
      <div className="d-flex flex-fill flex-lg-row flex-column justify-content-between">
        <div className="flex-shrink-0 flex-grow-1 flex-basis-auto">
          <Select
            styles={context.reactSelectStyles}
            classNamePrefix="react-select"
            instanceId="configuration-sort-order"
            defaultValue={valueToOption(
              settingsStore.gridConfig.config.sortOrder
            )}
            options={Object.values(settingsStore.gridConfig.options)}
            onChange={(option) =>
              onSortOrderChange((option as OptionT).value as SortOrderT)
            }
            hideSelectedOptions
            components={{ Menu: AnimatedMenu }}
          />
        </div>
        {settingsStore.gridConfig.config.sortOrder ===
        settingsStore.gridConfig.options.label.value ? (
          <div className="flex-shrink-0 flex-grow-1 flex-basis-auto mx-0 mx-lg-1 mt-1 mt-lg-0">
            <SortLabelName settingsStore={settingsStore} />
          </div>
        ) : null}
        {hideReverse ? null : (
          <div className="flex-shrink-1 flex-grow-0 form-check form-check-inline flex-basis-auto my-1 my-lg-auto ms-0 ms-lg-2 me-0 px-0">
            <span className="form-check form-switch">
              <input
                id="configuration-sort-reverse"
                className="form-check-input"
                type="checkbox"
                checked={settingsStore.gridConfig.config.reverseSort || false}
                onChange={(event) => onSortReverseChange(event.target.checked)}
              />
              <label
                className="form-check-label cursor-pointer"
                htmlFor="configuration-sort-reverse"
              >
                Reverse
              </label>
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export { AlertGroupSortConfiguration };
