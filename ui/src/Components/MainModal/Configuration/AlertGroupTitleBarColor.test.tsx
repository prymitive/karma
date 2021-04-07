import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { AlertGroupTitleBarColor } from "./AlertGroupTitleBarColor";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<AlertGroupTitleBarColor settingsStore={settingsStore} />);
};

describe("<AlertGroupTitleBarColor />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("colorTitleBar is 'false' by default", () => {
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
  });

  it("unchecking the checkbox sets stored colorTitleBar value to 'false'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-colortitlebar");

    settingsStore.alertGroupConfig.setColorTitleBar(true);
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
    checkbox.simulate("change", { target: { checked: false } });
    setTimeout(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
      done();
    }, 200);
  });

  it("checking the checkbox sets stored colorTitleBar value to 'true'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-colortitlebar");

    settingsStore.alertGroupConfig.setColorTitleBar(false);
    expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.alertGroupConfig.config.colorTitleBar).toBe(true);
      done();
    }, 200);
  });
});
