import {
  ReactSelectStyles,
  ReactSelectColors,
} from "Components/Theme/ReactSelect";

const MockThemeContext = {
  animations: {
    in: undefined,
    duration: 500,
  },
  isDark: false,
  reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
};

export { MockThemeContext };
