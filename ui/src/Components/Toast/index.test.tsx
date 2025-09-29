import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";

import { Toast } from ".";

describe("<Toast />", () => {
  it("renders body by default", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);
  });

  it("hides body on close icon click", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);

    tree.find("button.btn-close").simulate("click");
    expect(toDiffableHtml(tree.html())).not.toMatch(/fake error/);
  });

  it("shows hidden body on showNotifications event", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);

    tree.find("button.btn-close").simulate("click");
    expect(toDiffableHtml(tree.html())).not.toMatch(/fake error/);

    const e = new CustomEvent("showNotifications");
    act(() => {
      window.dispatchEvent(e);
    });
    tree.update();
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);
  });

  it("renders close icon when hasClose=true", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose={true}
      />,
    );
    expect(toDiffableHtml(tree.html())).toMatch(/btn-close/);
  });

  it("doesn't render close icon when hasClose=false", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose={false}
      />,
    );
    expect(toDiffableHtml(tree.html())).not.toMatch(/btn-close/);
  });

  it("calls onClose callback when close icon is clicked", () => {
    const mockOnClose = jest.fn();
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
        onClose={mockOnClose}
      />,
    );

    // Verify onClose hasn't been called yet
    expect(mockOnClose).not.toHaveBeenCalled();

    // Click the close button
    tree.find("button.btn-close").simulate("click");

    // Verify onClose was called exactly once
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("doesn't call onClose when no callback is provided", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />,
    );

    // Should not throw any errors when clicking without onClose callback
    expect(() => {
      tree.find("button.btn-close").simulate("click");
    }).not.toThrow();
    // Toast should still hide
    expect(toDiffableHtml(tree.html())).not.toMatch(/fake error/);
  });

  it("unmounts cleanly", () => {
    const wrapper = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="Test"
        hasClose
      />,
    );
    wrapper.unmount();
    // Test passes if no errors are thrown during unmount
  });

  it("applies correct alert class based on iconClass", () => {
    // Test danger class
    const dangerWrapper = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="Test"
        hasClose
      />,
    );
    expect(dangerWrapper.find(".alert-danger")).toHaveLength(1);

    // Test success class
    const successWrapper = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-success"
        message="Test"
        hasClose
      />,
    );
    expect(successWrapper.find(".alert-success")).toHaveLength(1);

    // Test warning class (default)
    const warningWrapper = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-warning"
        message="Test"
        hasClose
      />,
    );
    expect(warningWrapper.find(".alert-warning")).toHaveLength(1);

    // Test default when no specific iconClass
    const defaultWrapper = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-info"
        message="Test"
        hasClose
      />,
    );
    expect(defaultWrapper.find(".alert-warning")).toHaveLength(1);
  });
});
