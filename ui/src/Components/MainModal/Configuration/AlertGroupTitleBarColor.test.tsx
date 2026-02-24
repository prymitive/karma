import { act } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    // Verifies component renders correctly with default settings
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("colorTitleBar is 'false' by default", () => {
    // Verifies default value of colorTitleBar setting
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
  });

  it("unchecking the checkbox sets stored colorTitleBar value to 'false'", async () => {
    // Verifies clicking checkbox when checked sets store value to false
    const user = userEvent.setup();
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    act(() => {
      settingsStore.alertGroupConfig.setColorTitleBar(true);
    });
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
    await user.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
    });
  });

  it("checking the checkbox sets stored colorTitleBar value to 'true'", async () => {
    // Verifies clicking checkbox when unchecked sets store value to true
    const user = userEvent.setup();
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    act(() => {
      settingsStore.alertGroupConfig.setColorTitleBar(false);
    });
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
    await user.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
    });
  });
});
