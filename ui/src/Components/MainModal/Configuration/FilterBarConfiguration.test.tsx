import { act } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Settings } from "Stores/Settings";
import { FilterBarConfiguration } from "./FilterBarConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const renderConfiguration = () => {
  return render(<FilterBarConfiguration settingsStore={settingsStore} />);
};

describe("<FilterBarConfiguration />", () => {
  it("matches snapshot with default values", () => {
    // Verifies component renders correctly with default settings
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("unchecking the checkbox sets stored autohide value to 'false'", async () => {
    // Verifies clicking checkbox when checked sets store value to false
    const user = userEvent.setup();
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
    await user.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
    });
  });

  it("checking the checkbox sets stored autohide value to 'true'", async () => {
    // Verifies clicking checkbox when unchecked sets store value to true
    const user = userEvent.setup();
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    act(() => {
      settingsStore.filterBarConfig.setAutohide(false);
    });
    expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
    await user.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
    });
  });
});
