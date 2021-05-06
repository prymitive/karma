import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { OverviewModal } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  jest.useFakeTimers();
});

afterEach(() => {
  document.body.className = "";
});

const MountedOverviewModal = () => {
  return mount(<OverviewModal alertStore={alertStore} />);
};

describe("<OverviewModal />", () => {
  it("only renders the counter when modal is not shown", () => {
    const tree = MountedOverviewModal();
    expect(tree.text()).toBe("0");
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders modal content if fallback is not used", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find(".modal-title").text()).toBe("Overview");
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-title").text()).toBe("Overview");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-title")).toHaveLength(0);
  });

  it("hides the modal when button.btn-close is clicked", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");

    toggle.simulate("click");
    expect(tree.find(".modal-title").text()).toBe("Overview");

    tree.find("button.btn-close").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = MountedOverviewModal();

    tree.find("div.navbar-brand").simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");

    tree.find("div.navbar-brand").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});
