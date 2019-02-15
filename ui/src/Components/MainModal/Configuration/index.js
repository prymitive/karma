import React from "react";
import PropTypes from "prop-types";

import { Settings } from "Stores/Settings";
import { FetchConfiguration } from "./FetchConfiguration";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";

const Configuration = ({ settingsStore }) => (
  <form className="px-3">
    <FetchConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupConfiguration settingsStore={settingsStore} />
    <div className="mt-5" />
    <AlertGroupSortConfiguration settingsStore={settingsStore} />
  </form>
);
Configuration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired
};

export { Configuration };
