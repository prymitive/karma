import React from "react";

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

  it("unmounts cleanly", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
      />
    );
    tree.unmount();
  });
});
