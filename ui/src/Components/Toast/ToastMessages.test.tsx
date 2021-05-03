import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.info.setVersion("1.2.3");
});

describe("<ToastMessage />", () => {
  it("matches snapshot", () => {
    const tree = mount(
      <ToastMessage title="title string" message={<div>Div Message</div>} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

describe("<UpgradeToastMessage />", () => {
  it("matches snapshot", () => {
    const tree = mount(<UpgradeToastMessage alertStore={alertStore} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("clicking on the stop button pauses page reload", () => {
    const tree = mount(<UpgradeToastMessage alertStore={alertStore} />);
    expect(tree.find("button").html()).toMatch(/fa-stop/);
    expect(tree.find("button").text()).toBe("Stop auto-reload");

    tree.find("button").simulate("click");
    expect(tree.find("button").html()).toMatch(/fa-sync/);
    expect(tree.find("button").text()).toBe("Reload now");
  });

  it("clicking on the reload buton triggers a reload", () => {
    const tree = mount(<UpgradeToastMessage alertStore={alertStore} />);

    tree.find("button").simulate("click");
    expect(tree.find("button").text()).toBe("Reload now");

    tree.find("button").simulate("click");
    expect(alertStore.info.upgradeNeeded).toBe(true);
  });

  it("upgradeNeeded=true after onAnimationEnd is called", () => {
    const tree = mount(<UpgradeToastMessage alertStore={alertStore} />);
    tree.find("div.toast-upgrade-progressbar").simulate("animationend");
    expect(alertStore.info.upgradeNeeded).toBe(true);
  });
});
