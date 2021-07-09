import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
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

  it("renders a spinner placeholder while fetch is in progress", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find("LoadingMessage")).toHaveLength(1);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders an error message on fetch error", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "mock error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find("ErrorMessage")).toHaveLength(1);
    expect(tree.find("h1.text-danger").text()).toBe("mock error");
  });

  it("renders modal content if fallback is not used", () => {
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 20,
        counters: [],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find(".modal-title").text()).toBe("Overview");
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("re-fetches counters after timestamp change", () => {
    alertStore.info.setTimestamp("old");
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 20,
        counters: [],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);

    act(() => {
      alertStore.info.setTimestamp("new");
    });
    expect(useFetchGetMock.fetch.calls).toHaveLength(2);
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
