import { render, fireEvent } from "@testing-library/react";

import { Settings } from "Stores/Settings";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const renderConfiguration = () => {
  return render(<AlertGroupWidthConfiguration settingsStore={settingsStore} />);
};

describe("<AlertGroupWidthConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const { container } = renderConfiguration();
    expect(settingsStore.gridConfig.config.groupWidth).toBe(420);

    const slider = container.querySelector("div.input-range-thumb");
    fireEvent.click(slider!);

    fireEvent.keyDown(slider!, { key: "ArrowLeft", keyCode: 37 });
    fireEvent.keyUp(slider!, { key: "ArrowLeft", keyCode: 37 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(410);

    fireEvent.keyDown(slider!, { key: "ArrowRight", keyCode: 39 });
    fireEvent.keyUp(slider!, { key: "ArrowRight", keyCode: 39 });
    fireEvent.keyDown(slider!, { key: "ArrowRight", keyCode: 39 });
    fireEvent.keyUp(slider!, { key: "ArrowRight", keyCode: 39 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(430);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.gridConfig.setGroupWidth(460);
    const { container } = renderConfiguration();
    const thumb = container.querySelector(".input-range-thumb");
    expect(thumb).toBeInTheDocument();
  });
});
