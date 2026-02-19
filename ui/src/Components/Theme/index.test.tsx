import React from "react";

import { render } from "@testing-library/react";

import { BodyTheme } from ".";

const context = {
  isDark: true,
};

beforeEach(() => {
  document.body.classList.remove("theme-light");
  document.body.classList.remove("theme-dark");

  jest.spyOn(React, "useContext").mockImplementation(() => {
    return context;
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("<BodyTheme />", () => {
  it("uses light theme when ThemeContext->isDark is false", () => {
    context.isDark = false;
    render(<BodyTheme />);
    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });

  it("uses dark theme when ThemeContext->isDark is true", () => {
    context.isDark = true;
    render(<BodyTheme />);
    expect(document.body.classList.contains("theme-dark")).toEqual(true);
  });

  it("updates theme when ThemeContext->isDark is updated", () => {
    context.isDark = true;
    const { rerender } = render(<BodyTheme />);
    expect(document.body.classList.contains("theme-dark")).toEqual(true);

    document.body.classList.remove("theme-light");
    document.body.classList.remove("theme-dark");

    context.isDark = false;
    rerender(<BodyTheme />);

    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });
});
