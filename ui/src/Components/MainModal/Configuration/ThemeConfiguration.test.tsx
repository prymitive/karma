import { render, fireEvent, waitFor } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { Settings, ThemeT } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { ThemeConfiguration } from "./ThemeConfiguration";

let settingsStore: Settings;

beforeEach(() => {
  settingsStore = new Settings(null);
});

const renderConfiguration = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <ThemeConfiguration settingsStore={settingsStore} />
    </ThemeContext.Provider>,
  );
};

describe("<ThemeConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("resets stored config to defaults if it is invalid", async () => {
    settingsStore.themeConfig.setTheme("foo" as ThemeT);
    const { container } = renderConfiguration();
    const select = container.querySelector("div.react-select__value-container");
    expect(select?.textContent).toBe(
      settingsStore.themeConfig.options.auto.label,
    );
    await waitFor(() => {
      expect(settingsStore.themeConfig.config.theme).toBe(
        settingsStore.themeConfig.options.auto.value,
      );
    });
  });

  it("rendered correct default value", async () => {
    settingsStore.themeConfig.setTheme("auto");
    const { container } = renderConfiguration();
    const select = container.querySelector("div.react-select__value-container");
    await waitFor(() => {
      expect(select?.textContent).toBe(
        settingsStore.themeConfig.options.auto.label,
      );
    });
  });

  it("clicking on a label option updates settingsStore", async () => {
    const { container } = renderConfiguration();
    const input = container.querySelector(
      "input#react-select-configuration-theme-input",
    );
    fireEvent.change(input!, { target: { value: " " } });
    const options = container.querySelectorAll("div.react-select__option");
    fireEvent.click(options[1]);
    await waitFor(() => {
      expect(settingsStore.themeConfig.config.theme).toBe(
        settingsStore.themeConfig.options.dark.value,
      );
    });
  });
});
