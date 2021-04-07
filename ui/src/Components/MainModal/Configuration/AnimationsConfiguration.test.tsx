import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AnimationsConfiguration } from "./AnimationsConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<AnimationsConfiguration settingsStore={settingsStore} />);
};

describe("<AnimationsConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("animations is 'true' by default", () => {
    expect(settingsStore.themeConfig.config.animations).toBe(true);
  });

  it("unchecking the checkbox sets stored animations value to 'false'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-animations");

    settingsStore.themeConfig.setAnimations(true);
    expect(settingsStore.themeConfig.config.animations).toBe(true);
    checkbox.simulate("change", { target: { checked: false } });
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.animations).toBe(false);
      done();
    }, 200);
  });

  it("checking the checkbox sets stored animations value to 'true'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-animations");

    settingsStore.themeConfig.setAnimations(false);
    expect(settingsStore.themeConfig.config.animations).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.animations).toBe(true);
      done();
    }, 200);
  });
});
