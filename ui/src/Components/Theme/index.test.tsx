import React from "react";

import { mount } from "enzyme";

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
    mount(<BodyTheme />);
    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });

  it("uses dark theme when ThemeContext->isDark is true", () => {
    context.isDark = true;
    mount(<BodyTheme />);
    expect(document.body.classList.contains("theme-dark")).toEqual(true);
  });

  it("updates theme when ThemeContext->isDark is updated", () => {
    context.isDark = true;
    const tree = mount(<BodyTheme />);
    expect(document.body.classList.contains("theme-dark")).toEqual(true);

    document.body.classList.remove("theme-light");
    document.body.classList.remove("theme-dark");

    context.isDark = false;
    tree.setProps({});

    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });
});
