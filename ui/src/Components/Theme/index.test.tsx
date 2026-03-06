import React, { act } from "react";

import { render } from "@testing-library/react";

import { BodyTheme } from ".";

const context = {
  isDark: true,
};

beforeEach(() => {
  document.body.classList.remove("theme-light");
  document.body.classList.remove("theme-dark");
  document.documentElement.removeAttribute("data-bs-theme");

  jest.spyOn(React, "useContext").mockImplementation(() => {
    return context;
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("<BodyTheme />", () => {
  it("uses light theme when ThemeContext->isDark is false", async () => {
    // Verifies body class and data-bs-theme attribute are set for light theme when isDark is false
    context.isDark = false;
    await act(async () => {
      render(<BodyTheme />);
    });
    expect(document.body.classList.contains("theme-light")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "light",
    );
  });

  it("uses dark theme when ThemeContext->isDark is true", async () => {
    // Verifies body class and data-bs-theme attribute are set for dark theme when isDark is true
    context.isDark = true;
    await act(async () => {
      render(<BodyTheme />);
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "dark",
    );
  });

  it("updates theme when ThemeContext->isDark is updated", async () => {
    // Verifies body class updates when isDark context value changes
    context.isDark = true;
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(<BodyTheme />);
      rerender = result.rerender;
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);

    document.body.classList.remove("theme-light");
    document.body.classList.remove("theme-dark");

    context.isDark = false;
    await act(async () => {
      rerender!(<BodyTheme />);
    });

    expect(document.body.classList.contains("theme-light")).toEqual(true);
    expect(document.documentElement.getAttribute("data-bs-theme")).toEqual(
      "light",
    );
  });
});
