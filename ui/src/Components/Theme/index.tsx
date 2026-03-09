import React, { use, FC, useEffect } from "react";

import type { StylesConfig } from "react-select";

export interface ThemeCtx {
  isDark: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reactSelectStyles: StylesConfig<any, any>;
  animations: {
    duration: number;
  };
}

const ThemeContext = React.createContext({
  isDark: false,
  reactSelectStyles: {},
  animations: { duration: 1000 },
} as ThemeCtx);

const BodyTheme: FC = () => {
  const context = use(ThemeContext);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-bs-theme",
      context.isDark ? "dark" : "light",
    );
    // TODO: this should be removed when not needed
    document.body.classList.toggle("theme-dark", context.isDark);
    document.body.classList.toggle("theme-light", !context.isDark);
  }, [context.isDark]);

  return null;
};

export { BodyTheme, ThemeContext };
