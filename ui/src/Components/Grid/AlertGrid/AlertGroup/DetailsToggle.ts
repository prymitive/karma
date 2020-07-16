import { IsMobile } from "Common/Device";
import { Settings } from "Stores/Settings";

const DefaultDetailsCollapseValue = (settingsStore: Settings): boolean => {
  let defaultCollapseState;
  switch (settingsStore.alertGroupConfig.config.defaultCollapseState) {
    case settingsStore.alertGroupConfig.options.collapsed.value:
      defaultCollapseState = true;
      break;
    case settingsStore.alertGroupConfig.options.collapsedOnMobile.value:
      defaultCollapseState = IsMobile();
      break;
    default:
      defaultCollapseState = false;
      break;
  }

  return defaultCollapseState;
};

export { DefaultDetailsCollapseValue };
