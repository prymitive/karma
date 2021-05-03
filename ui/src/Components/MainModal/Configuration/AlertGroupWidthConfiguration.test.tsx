import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AlertGroupWidthConfiguration } from "./AlertGroupWidthConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<AlertGroupWidthConfiguration settingsStore={settingsStore} />);
};

describe("<AlertGroupWidthConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.gridConfig.config.groupWidth).toBe(420);

    const slider = tree.find(`div.input-range-thumb`).first();
    slider.simulate("click");

    slider.simulate("keyDown", { key: "ArrowLeft", keyCode: 37 });
    slider.simulate("keyUp", { key: "ArrowLeft", keyCode: 37 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(410);

    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });

    expect(settingsStore.gridConfig.config.groupWidth).toBe(430);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.gridConfig.setGroupWidth(460);
    const component = FakeConfiguration();
    expect(component.find("Range").props().values).toContain(460);
  });
});
