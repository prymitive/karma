import { act } from "react-dom/test-utils";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

const renderInhibitedByModal = (fingerprints: string[]) => {
  return render(
    <InhibitedByModal alertStore={alertStore} fingerprints={fingerprints} />,
  );
};

describe("<InhibitedByModal />", () => {
  it("renders a spinner placeholder while modal content is loading", () => {
    const { container } = renderInhibitedByModal(["foo"]);
    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);
    expect(
      document.body.querySelector(".modal-content svg.fa-spinner"),
    ).toBeInTheDocument();
  });

  it("renders modal content if fallback is not used", () => {
    const { container } = renderInhibitedByModal(["foo"]);
    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);
    expect(screen.getByText("Inhibiting alerts")).toBeInTheDocument();
  });

  it("handles multiple fingerprints", () => {
    const { container } = renderInhibitedByModal(["foo", "bar"]);
    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);
    expect(screen.getByText("Inhibiting alerts")).toBeInTheDocument();
  });

  it("hides the modal when toggle() is called twice", async () => {
    const { container } = renderInhibitedByModal(["foo"]);
    const toggle = container.querySelector("span.badge.bg-light");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.getByText("Inhibiting alerts")).toBeInTheDocument();

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(screen.queryByText("Inhibiting alerts")).not.toBeInTheDocument();
    });
  });

  it("hides the modal when button.btn-close is clicked", async () => {
    const { container } = renderInhibitedByModal(["foo"]);
    const toggle = container.querySelector("span.badge.bg-light");

    fireEvent.click(toggle!);
    expect(screen.getByText("Inhibiting alerts")).toBeInTheDocument();

    const closeBtn = document.body.querySelector("button.btn-close");
    fireEvent.click(closeBtn!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(screen.queryByText("Inhibiting alerts")).not.toBeInTheDocument();
    });
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const { container } = renderInhibitedByModal(["foo"]);
    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const { container } = renderInhibitedByModal(["foo"]);

    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const { container, unmount } = renderInhibitedByModal(["foo"]);

    const toggle = container.querySelector("span.badge.bg-light");
    fireEvent.click(toggle!);

    act(() => {
      unmount();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});
