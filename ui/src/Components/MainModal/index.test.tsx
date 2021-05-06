import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { MainModal } from ".";

let alertStore: AlertStore;
let settingsStore: Settings;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);

  jest.useFakeTimers();
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.reset();
  document.body.className = "";
});

const MountedMainModal = () => {
  return mount(
    <ThemeContext.Provider value={MockThemeContext}>
      <MainModal alertStore={alertStore} settingsStore={settingsStore} />
    </ThemeContext.Provider>
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = MountedMainModal();
    expect(tree.find("FontAwesomeIcon")).toHaveLength(1);
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("renders modal content if fallback is not used", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
    expect(tree.find("MainModalContent")).toHaveLength(1);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(1);

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("hides the modal when button.btn-close is clicked", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    expect(tree.find("MainModalContent")).toHaveLength(1);

    tree.find("button.btn-close").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});
