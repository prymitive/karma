import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { GridLabelName } from "./GridLabelName";

const MultiGridConfiguration = observer(
  class MultiGridConfiguration extends Component {
    static propTypes = {
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };
    static contextType = ThemeContext;

    onSortReverseChange = action((event) => {
      const { settingsStore } = this.props;

      settingsStore.multiGridConfig.config.gridSortReverse =
        event.target.checked;
    });

    render() {
      const { settingsStore } = this.props;

      return (
        <div className="form-group mb-0">
          <div className="d-flex flex-fill flex-lg-row flex-column justify-content-between">
            <div className="flex-shrink-0 flex-grow-1 flex-basis-auto mx-0 mx-lg-1 mt-1 mt-lg-0">
              <GridLabelName settingsStore={settingsStore} />
            </div>
            <div className="flex-shrink-1 flex-grow-0 form-check form-check-inline flex-basis-auto mt-1 mt-lg-0 ml-0 ml-lg-1 mr-0">
              <span className="custom-control custom-switch">
                <input
                  id="configuration-multigrid-sort-reverse"
                  className="custom-control-input"
                  type="checkbox"
                  value=""
                  checked={
                    settingsStore.multiGridConfig.config.gridSortReverse ||
                    false
                  }
                  onChange={this.onSortReverseChange}
                />
                <label
                  className="custom-control-label cursor-pointer mr-3"
                  htmlFor="configuration-multigrid-sort-reverse"
                >
                  Reverse order
                </label>
              </span>
            </div>
          </div>
        </div>
      );
    }
  }
);

export { MultiGridConfiguration };
