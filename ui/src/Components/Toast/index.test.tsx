import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";

import { Toast } from ".";

describe("<Toast />", () => {
  it("renders body by default", () => {
    render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(screen.getByText("fake error")).toBeInTheDocument();
  });

  it("hides body on close icon click", () => {
    const { container } = render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(screen.getByText("fake error")).toBeInTheDocument();

    const closeBtn = container.querySelector("span.badge.cursor-pointer");
    fireEvent.click(closeBtn!);
    expect(screen.queryByText("fake error")).not.toBeInTheDocument();
  });

  it("shows hidden body on showNotifications event", () => {
    const { container } = render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(screen.getByText("fake error")).toBeInTheDocument();

    const closeBtn = container.querySelector("span.badge.cursor-pointer");
    fireEvent.click(closeBtn!);
    expect(screen.queryByText("fake error")).not.toBeInTheDocument();

    const e = new CustomEvent("showNotifications");
    act(() => {
      window.dispatchEvent(e);
    });
    expect(screen.getByText("fake error")).toBeInTheDocument();
  });

  it("renders close icon when hasClose=true", () => {
    const { container } = render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose={true}
      />,
    );
    expect(container.querySelector("svg.fa-xmark")).toBeInTheDocument();
  });

  it("doesn't render close icon when hasClose=false", () => {
    const { container } = render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose={false}
      />,
    );
    expect(container.querySelector("svg.fa-xmark")).not.toBeInTheDocument();
  });

  it("unmounts cleanly", () => {
    const { unmount } = render(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    unmount();
  });
});
