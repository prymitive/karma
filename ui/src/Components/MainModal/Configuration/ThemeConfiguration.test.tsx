import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { Settings, ThemeT } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { ThemeConfiguration } from "./ThemeConfiguration";

let settingsStore: Settings;

beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<ThemeConfiguration settingsStore={settingsStore} />, {
    wrappingComponent: ThemeContext.Provider,
    wrappingComponentProps: { value: MockThemeContext },
  });
};

describe("<ThemeConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("resets stored config to defaults if it is invalid", (done) => {
    settingsStore.themeConfig.setTheme("foo" as ThemeT);
    const tree = FakeConfiguration();
    const select = tree.find("div.react-select__value-container");
    expect(select.text()).toBe(settingsStore.themeConfig.options.auto.label);
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.theme).toBe(
        settingsStore.themeConfig.options.auto.value
      );
      done();
    }, 200);
  });

  it("rendered correct default value", (done) => {
    settingsStore.themeConfig.setTheme("auto");
    const tree = FakeConfiguration();
    const select = tree.find("div.react-select__value-container");
    setTimeout(() => {
      expect(select.text()).toBe(settingsStore.themeConfig.options.auto.label);
      done();
    }, 200);
  });

  it("clicking on a label option updates settingsStore", (done) => {
    const tree = FakeConfiguration();
    tree
      .find("input#react-select-configuration-theme-input")
      .simulate("change", { target: { value: " " } });
    const options = tree.find("div.react-select__option");
    options.at(1).simulate("click");
    setTimeout(() => {
      expect(settingsStore.themeConfig.config.theme).toBe(
        settingsStore.themeConfig.options.dark.value
      );
      done();
    }, 200);
  });
});
