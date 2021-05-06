import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { InhibitedByModal } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
});

afterEach(() => {
  document.body.className = "";
});

describe("<InhibitedByModal />", () => {
  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );
    const toggle = tree.find("span.badge.bg-light");
    toggle.simulate("click");
    expect(tree.find("InhibitedByModalContent")).toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders modal content if fallback is not used", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );
    const toggle = tree.find("span.badge.bg-light");
    toggle.simulate("click");
    expect(tree.find(".modal-title").text()).toBe("Inhibiting alerts");
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );
    const toggle = tree.find("span.badge.bg-light");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-title").text()).toBe("Inhibiting alerts");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-title")).toHaveLength(0);
  });

  it("hides the modal when button.btn-close is clicked", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );
    const toggle = tree.find("span.badge.bg-light");

    toggle.simulate("click");
    expect(tree.find(".modal-title").text()).toBe("Inhibiting alerts");

    tree.find("button.btn-close").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("InhibitedByModalContent")).toHaveLength(0);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );
    const toggle = tree.find("span.badge.bg-light");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );

    tree.find("span.badge.bg-light").simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");

    tree.find("span.badge.bg-light").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = mount(
      <InhibitedByModal alertStore={alertStore} fingerprints={["foo=bar"]} />
    );

    const toggle = tree.find("span.badge.bg-light");
    toggle.simulate("click");

    act(() => {
      tree.unmount();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});
