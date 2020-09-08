import React from "react";

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

  it("toggles body on toggle icon click", () => {
    const tree = mount(
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message="fake error"
      />
    );
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);

    tree.find("svg.cursor-pointer").simulate("click");
    expect(toDiffableHtml(tree.html())).not.toMatch(/fake error/);

    tree.find("svg.cursor-pointer").simulate("click");
    expect(toDiffableHtml(tree.html())).toMatch(/fake error/);
  });
});
