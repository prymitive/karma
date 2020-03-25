import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import Select from "react-select";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { SortLabelName } from "./SortLabelName";

const AlertGroupSortConfiguration = observer(
  class AlertGroupSortConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };
    static contextType = ThemeContext;

    constructor(props) {
      super(props);

      this.validateConfig();
    }

    onSortOrderChange = action((newValue, actionMeta) => {
      const { settingsStore } = this.props;

      settingsStore.gridConfig.config.sortOrder = newValue.value;
    });

    onSortReverseChange = action((event) => {
      const { settingsStore } = this.props;

      settingsStore.gridConfig.config.reverseSort = event.target.checked;
    });

    valueToOption = (val) => {
      const { settingsStore } = this.props;

      return { label: settingsStore.gridConfig.options[val].label, value: val };
    };

    validateConfig = action(() => {
      const { settingsStore } = this.props;

      if (
        !Object.values(settingsStore.gridConfig.options)
          .map((o) => o.value)
          .includes(settingsStore.gridConfig.config.sortOrder)
      ) {
        settingsStore.gridConfig.config.sortOrder =
          settingsStore.gridConfig.options.default.value;
      }
    });

    render() {
      const { settingsStore } = this.props;

      const hideReverse =
        settingsStore.gridConfig.config.sortOrder ===
          settingsStore.gridConfig.options.default.value ||
        settingsStore.gridConfig.config.sortOrder ===
          settingsStore.gridConfig.options.disabled.value;

      return (
        <div className="form-group mb-0">
          <div className="d-flex flex-fill flex-lg-row flex-column justify-content-between">
            <div className="flex-shrink-0 flex-grow-1 flex-basis-auto">
              <Select
                styles={this.context.reactSelectStyles}
                classNamePrefix="react-select"
                instanceId="configuration-sort-order"
                defaultValue={this.valueToOption(
                  settingsStore.gridConfig.config.sortOrder
                )}
                options={Object.values(settingsStore.gridConfig.options)}
                onChange={this.onSortOrderChange}
                hideSelectedOptions
              />
            </div>
            {settingsStore.gridConfig.config.sortOrder ===
            settingsStore.gridConfig.options.label.value ? (
              <div className="flex-shrink-0 flex-grow-1 flex-basis-auto mx-0 mx-lg-1 mt-1 mt-lg-0">
                <SortLabelName settingsStore={settingsStore} />
              </div>
            ) : null}
            {hideReverse ? null : (
              <div className="flex-shrink-1 flex-grow-0 form-check form-check-inline flex-basis-auto mt-1 mt-lg-0 ml-0 ml-lg-1 mr-0">
                <span className="custom-control custom-switch">
                  <input
                    id="configuration-sort-reverse"
                    className="custom-control-input"
                    type="checkbox"
                    value=""
                    checked={
                      settingsStore.gridConfig.config.reverseSort || false
                    }
                    onChange={this.onSortReverseChange}
                  />
                  <label
                    className="custom-control-label cursor-pointer mr-3"
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
    }
  }
);

export { AlertGroupSortConfiguration };
