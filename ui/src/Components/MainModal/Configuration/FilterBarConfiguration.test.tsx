import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { FilterBarConfiguration } from "./FilterBarConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  settingsStore = new Settings(null);
});

const FakeConfiguration = () => {
  return mount(<FilterBarConfiguration settingsStore={settingsStore} />);
};

describe("<FilterBarConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("unchecking the checkbox sets stored autohide value to 'false'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-autohide");

    expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
    checkbox.simulate("change", { target: { checked: false } });
    setTimeout(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
      done();
    }, 200);
  });

  it("checking the checkbox sets stored autohide value to 'true'", (done) => {
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-autohide");

    expect(settingsStore.filterBarConfig.config.autohide).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.filterBarConfig.config.autohide).toBe(true);
      done();
    }, 200);
  });
});
