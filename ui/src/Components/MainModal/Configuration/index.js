import React from "react";
import PropTypes from "prop-types";

import { Settings } from "Stores/Settings";
import { FetchConfiguration } from "./FetchConfiguration";
import { FilterBarConfiguration } from "./FilterBarConfiguration";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";
import { AlertGroupCollapseConfiguration } from "./AlertGroupCollapseConfiguration";
import { AlertGroupTitleBarColor } from "./AlertGroupTitleBarColor";

const Configuration = ({ settingsStore }) => (
  <form className="px-3">
    <FetchConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <FilterBarConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupTitleBarColor settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupWidthConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupCollapseConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupSortConfiguration settingsStore={settingsStore} />
  </form>
);
Configuration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired
};

export { Configuration };
