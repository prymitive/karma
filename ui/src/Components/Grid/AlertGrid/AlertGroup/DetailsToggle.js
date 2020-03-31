import { IsMobile } from "Common/Device";

const DefaultDetailsCollapseValue = (settingsStore) => {
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
