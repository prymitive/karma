import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { FetchConfiguration } from "./FetchConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<FetchConfiguration settingsStore={settingsStore} />);
};

describe("<FetchConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("settings are updated on completed change", () => {
    const tree = FakeConfiguration();
    expect(settingsStore.fetchConfig.config.interval).toBe(30);

    const slider = tree.find(`div.input-range-thumb`).first();
    slider.simulate("click");

    slider.simulate("keyDown", { key: "ArrowLeft", keyCode: 37 });
    slider.simulate("keyUp", { key: "ArrowLeft", keyCode: 37 });

    expect(settingsStore.fetchConfig.config.interval).toBe(20);

    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyDown", { key: "ArrowRight", keyCode: 39 });
    slider.simulate("keyUp", { key: "ArrowRight", keyCode: 39 });

    expect(settingsStore.fetchConfig.config.interval).toBe(40);
  });

  it("custom interval value is rendered correctly", () => {
    settingsStore.fetchConfig.setInterval(70);
    const component = FakeConfiguration();
    expect(component.find("Range").props().values).toContain(70);
  });
});
