import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { Settings } from "Stores/Settings";
import { AlertGroupTitleBarColor } from "./AlertGroupTitleBarColor";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const renderConfiguration = () => {
  return render(<AlertGroupTitleBarColor settingsStore={settingsStore} />);
};

describe("<AlertGroupTitleBarColor />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("colorTitleBar is 'false' by default", () => {
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
  });

  it("unchecking the checkbox sets stored colorTitleBar value to 'false'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    settingsStore.alertGroupConfig.setColorTitleBar(true);
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
    });
  });

  it("checking the checkbox sets stored colorTitleBar value to 'true'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    settingsStore.alertGroupConfig.setColorTitleBar(false);
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
    });
  });
});
