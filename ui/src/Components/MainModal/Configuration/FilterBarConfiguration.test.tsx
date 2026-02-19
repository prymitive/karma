import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("unchecking the checkbox sets stored autohide value to 'false'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
    });
  });

  it("checking the checkbox sets stored autohide value to 'true'", async () => {
    renderConfiguration();
    const checkbox = screen.getByRole("checkbox");

    settingsStore.filterBarConfig.setAutohide(false);
    expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
    });
  });
});
