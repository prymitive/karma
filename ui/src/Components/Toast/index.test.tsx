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
      />
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
      />
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);

    tree.find("span.badge.cursor-pointer").simulate("click");
    expect(toDiffableHtml(tree.html())).not.toMatch(/fake error/);
  });

  it("shows hidden body on showNotifications event", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);

    tree.find("span.badge.cursor-pointer").simulate("click");
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
      />
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fa-times/);
  });

  it("doesn't render close icon when hasClose=false", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose={false}
      />
    );
    expect(toDiffableHtml(tree.html())).not.toMatch(/fa-times/);
  });

  it("unmounts cleanly", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
        hasClose
      />
    );
    tree.unmount();
  });
});
