import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { Settings } from "Stores/Settings";
import { AnimationsConfiguration } from "./AnimationsConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const renderConfiguration = () => {
  return render(<AnimationsConfiguration settingsStore={settingsStore} />);
};

describe("<AnimationsConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("animations is 'true' by default", () => {
    expect(settingsStore.themeConfig.config.animations).toBe(true);
  });

  it("unchecking the checkbox sets stored animations value to 'false'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    settingsStore.themeConfig.setAnimations(true);
    expect(settingsStore.themeConfig.config.animations).toBe(true);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.themeConfig.config.animations).toBe(false);
    });
  });

  it("checking the checkbox sets stored animations value to 'true'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    settingsStore.themeConfig.setAnimations(false);
    expect(settingsStore.themeConfig.config.animations).toBe(false);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.themeConfig.config.animations).toBe(true);
    });
  });
});
