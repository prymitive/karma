import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Accordion, AccordionItem } from ".";

describe("<Accordion />", () => {
  it("matches snapshot", () => {
    const tree = mount(
      <Accordion>
        <AccordionItem text="title 1" content="item 1" />
        <AccordionItem text="title 2" content="item 2" defaultIsOpen />
        <AccordionItem text="title 1" content="item 1" />
      </Accordion>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

describe("<AccordionItem />", () => {
  it("doesn't render content by default", () => {
    const tree = mount(<AccordionItem text="title" content="content" />);
    expect(tree.text()).toBe("title");
  });

  it("doesn't render content when defaultIsOpen=false", () => {
    const tree = mount(
      <AccordionItem text="title" content="content" defaultIsOpen={false} />
    );
    expect(tree.text()).toBe("title");
  });

  it("renders content when defaultIsOpen=true", () => {
    const tree = mount(
      <AccordionItem text="title" content="content" defaultIsOpen={true} />
    );
    expect(tree.text()).toBe("titlecontent");
  });

  it("toggles content after header click", () => {
    const tree = mount(<AccordionItem text="title" content="content" />);
    expect(tree.text()).toBe("title");

    tree.find("button.accordion-button").simulate("click");
    expect(tree.text()).toBe("titlecontent");

    tree.find("button.accordion-button").simulate("click");
    expect(tree.text()).toBe("title");
  });
});
