export type ThemeT = "light" | "dark" | "auto";

export type CollapseGroupsT = "expanded" | "collapsed" | "collapsedOnMobile";

export interface UIDefaults {
  Refresh: number;
  HideFiltersWhenIdle: boolean;
  ColorTitlebar: boolean;
  Theme: ThemeT;
  MinimalGroupWidth: number;
  AlertsPerGroup: number;
  CollapseGroups: CollapseGroupsT;
  MultiGridLabel: string;
  MultiGridSortReverse: boolean;
}
