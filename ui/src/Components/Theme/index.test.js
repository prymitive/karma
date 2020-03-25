import * as React from "react";

import { mount } from "enzyme";

import { BodyTheme, ThemeContext } from ".";

beforeEach(() => {
  document.body.classList.remove("theme-light");
  document.body.classList.remove("theme-dark");
});

describe("<BodyTheme />", () => {
  it("uses light theme when ThemeContext->isDark is false", () => {
    mount(<BodyTheme />, {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: { isDark: false } },
    });
    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });

  it("uses dark theme when ThemeContext->isDark is true", () => {
    mount(<BodyTheme />, {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: { isDark: true } },
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);
  });

  it("updates theme when ThemeContext->isDark is updated", () => {
    const tree = mount(<BodyTheme />, {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: { isDark: true } },
    });
    expect(document.body.classList.contains("theme-dark")).toEqual(true);

    document.body.classList.remove("theme-light");
    document.body.classList.remove("theme-dark");

    const provider = tree.getWrappingComponent();
    provider.setProps({ value: { isDark: false } });

    expect(document.body.classList.contains("theme-light")).toEqual(true);
  });
});
