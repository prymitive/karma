import React from "react";
import PropTypes from "prop-types";

import { Settings } from "Stores/Settings";
import { Accordion } from "Components/Accordion";
import { FetchConfiguration } from "./FetchConfiguration";
import { FilterBarConfiguration } from "./FilterBarConfiguration";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";
import { AlertGroupCollapseConfiguration } from "./AlertGroupCollapseConfiguration";
import { AlertGroupTitleBarColor } from "./AlertGroupTitleBarColor";

const Configuration = ({ settingsStore }) => (
  <form className="px-3 accordion">
    <Accordion
      text="Refresh interval"
      content={<FetchConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: true }}
    />
    <Accordion
      text="Filter bar configuration"
      content={<FilterBarConfiguration settingsStore={settingsStore} />}
    />
    <Accordion
      text="Alert group titlebar configuration"
      content={<AlertGroupTitleBarColor settingsStore={settingsStore} />}
    />
    <Accordion
      text="Minimal alert group width"
      content={<AlertGroupWidthConfiguration settingsStore={settingsStore} />}
    />
    <Accordion
      text="Default number of alerts to show per group"
      content={<AlertGroupConfiguration settingsStore={settingsStore} />}
    />
    <Accordion
      text="Default alert group display"
      content={
        <AlertGroupCollapseConfiguration settingsStore={settingsStore} />
      }
    />
    <Accordion
      text="Grid sort order"
      content={<AlertGroupSortConfiguration settingsStore={settingsStore} />}
    />
  </form>
);
Configuration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired
};

export { Configuration };
