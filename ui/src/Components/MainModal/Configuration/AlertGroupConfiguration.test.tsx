import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AlertGroupConfiguration } from "./AlertGroupConfiguration";

let settingsStore: Settings;

beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<AlertGroupConfiguration settingsStore={settingsStore} />);
};

describe("<AlertGroupConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(5);

    const slider = tree.find(`div.input-range-thumb`).first();
    slider.simulate("click");

    slider.simulate("keyDown", { key: "ArrowLeft", keyCode: 37 });
    slider.simulate("keyUp", { key: "ArrowLeft", keyCode: 37 });

    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(4);

    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(6);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.alertGroupConfig.setDefaultRenderCount(4);
    const component = FakeConfiguration();
    expect(component.find("Range").props().values).toContain(4);
  });
});
