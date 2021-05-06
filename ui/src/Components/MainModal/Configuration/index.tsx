import { FC } from "react";

import { Settings } from "Stores/Settings";
import { Accordion, AccordionItem } from "Components/Accordion";
import { FetchConfiguration } from "./FetchConfiguration";
import { FilterBarConfiguration } from "./FilterBarConfiguration";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";
import { AlertGroupCollapseConfiguration } from "./AlertGroupCollapseConfiguration";
import { AlertGroupTitleBarColor } from "./AlertGroupTitleBarColor";
import { ThemeConfiguration } from "./ThemeConfiguration";
import { MultiGridConfiguration } from "./MultiGridConfiguration";
import { AnimationsConfiguration } from "./AnimationsConfiguration";

const Configuration: FC<{
  settingsStore: Settings;
  defaultIsOpen: boolean;
}> = ({ settingsStore, defaultIsOpen }) => (
  <Accordion>
    <AccordionItem
      text="Refresh interval"
      content={<FetchConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={true}
    />
    <AccordionItem
      text="Filter bar configuration"
      content={<FilterBarConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Theme"
      content={
        <>
          <ThemeConfiguration settingsStore={settingsStore} />
          <AlertGroupTitleBarColor settingsStore={settingsStore} />
          <AnimationsConfiguration settingsStore={settingsStore} />
        </>
      }
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Minimal alert group width"
      content={<AlertGroupWidthConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Default number of alerts to show per group"
      content={<AlertGroupConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Default alert group display"
      content={
        <AlertGroupCollapseConfiguration settingsStore={settingsStore} />
      }
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Grid sort order"
      content={<AlertGroupSortConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={defaultIsOpen}
    />
    <AccordionItem
      text="Multi-grid source label"
      content={<MultiGridConfiguration settingsStore={settingsStore} />}
      defaultIsOpen={defaultIsOpen}
    />
  </Accordion>
);

export { Configuration };
