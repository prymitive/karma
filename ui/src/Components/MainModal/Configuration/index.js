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
import { ThemeConfiguration } from "./ThemeConfiguration";
import { MultiGridConfiguration } from "./MultiGridConfiguration";

const Configuration = ({ settingsStore, defaultIsOpen }) => (
  <form className="px-3 accordion">
    <Accordion
      text="Refresh interval"
      content={<FetchConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: true }}
    />
    <Accordion
      text="Filter bar configuration"
      content={<FilterBarConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Theme"
      content={
        <React.Fragment>
          <ThemeConfiguration settingsStore={settingsStore} />
          <AlertGroupTitleBarColor settingsStore={settingsStore} />
        </React.Fragment>
      }
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Minimal alert group width"
      content={<AlertGroupWidthConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Default number of alerts to show per group"
      content={<AlertGroupConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Default alert group display"
      content={
        <AlertGroupCollapseConfiguration settingsStore={settingsStore} />
      }
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Grid sort order"
      content={<AlertGroupSortConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: defaultIsOpen }}
    />
    <Accordion
      text="Multi-grid source label"
      content={<MultiGridConfiguration settingsStore={settingsStore} />}
      extraProps={{ open: defaultIsOpen }}
    />
  </form>
);
Configuration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  defaultIsOpen: PropTypes.bool.isRequired,
};

export { Configuration };
