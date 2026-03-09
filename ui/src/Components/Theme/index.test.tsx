import React, { act } from "react";

import { render } from "@testing-library/react";

import { ThemeContext, BodyTheme } from ".";
import type { ThemeCtx } from ".";

beforeEach(() => {
  document.body.classList.remove("theme-light");
  document.body.classList.remove("theme-dark");
  document.documentElement.removeAttribute("data-bs-theme");
});

const renderWithTheme = (ctx: Partial<ThemeCtx>) =>
  render(
    <ThemeContext value={ctx as ThemeCtx}>
      <BodyTheme />
    </ThemeContext>,
  );

describe("<BodyTheme />", () => {
  it("uses light theme when ThemeContext->isDark is false", async () => {
    // Verifies body class and data-bs-theme attribute are set for light theme when isDark is false
    await act(async () => {
      renderWithTheme({ isDark: false });
    });
    expect(document.body.classList.contains("theme-light")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "light",
    );
  });

  it("uses dark theme when ThemeContext->isDark is true", async () => {
    // Verifies body class and data-bs-theme attribute are set for dark theme when isDark is true
    await act(async () => {
      renderWithTheme({ isDark: true });
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "dark",
    );
  });

  it("updates theme when ThemeContext->isDark is updated", async () => {
    // Verifies body class updates when isDark context value changes
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = renderWithTheme({ isDark: true });
      rerender = result.rerender;
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);

    document.body.classList.remove("theme-light");
    document.body.classList.remove("theme-dark");

    await act(async () => {
      rerender!(
        <ThemeContext value={{ isDark: false } as ThemeCtx}>
          <BodyTheme />
        </ThemeContext>,
      );
    });

    expect(document.body.classList.contains("theme-light")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "light",
    );
  });
});
