import { UIDefaults } from "Models/UI";

const DefaultsBase64 =
  "eyJSZWZyZXNoIjo0NTAwMDAwMDAwMCwiSGlkZUZpbHRlcnNXaGVuSWRsZSI6ZmFsc2UsIkNvbG9yVGl0bGViYXIiOmZhbHNlLCJUaGVtZSI6ImxpZ2h0IiwiQW5pbWF0aW9ucyI6dHJ1ZSwiTWluaW1hbEdyb3VwV2lkdGgiOjU1NSwiQWxlcnRzUGVyR3JvdXAiOjE1LCJDb2xsYXBzZUdyb3VwcyI6ImV4cGFuZGVkIiwiTXVsdGlHcmlkTGFiZWwiOiIiLCJNdWx0aUdyaWRTb3J0UmV2ZXJzZSI6ZmFsc2V9Cg==";
const DefaultsObject: UIDefaults = {
  Refresh: 45000000000,
  HideFiltersWhenIdle: false,
  ColorTitlebar: false,
  Theme: "light",
  Animations: true,
  MinimalGroupWidth: 555,
  AlertsPerGroup: 15,
  CollapseGroups: "expanded",
  MultiGridLabel: "",
  MultiGridSortReverse: false,
};

export { DefaultsBase64, DefaultsObject };
