import React from "react";

import { mount } from "enzyme";

import { Accordion } from ".";

describe("<Accordion />", () => {
  it("doesn't render content by default", () => {
    const tree = mount(<Accordion text="title" content="content" />);
    expect(tree.text()).toBe("title");
  });

  it("doesn't render content when defaultIsOpen=false", () => {
    const tree = mount(
      <Accordion text="title" content="content" defaultIsOpen={false} />
    );
    expect(tree.text()).toBe("title");
  });

  it("renders content when defaultIsOpen=true", () => {
    const tree = mount(
      <Accordion text="title" content="content" defaultIsOpen={true} />
    );
    expect(tree.text()).toBe("titlecontent");
  });

  it("toggles content after header click", () => {
    const tree = mount(<Accordion text="title" content="content" />);
    expect(tree.text()).toBe("title");

    tree.find("div.card-header").simulate("click");
    expect(tree.text()).toBe("titlecontent");

    tree.find("div.card-header").simulate("click");
    expect(tree.text()).toBe("title");
  });
});
