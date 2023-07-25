import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Accordion, AccordionItem } from ".";

describe("<Accordion />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <Accordion>
        <AccordionItem text="title 1" content="item 1" />
        <AccordionItem text="title 2" content="item 2" defaultIsOpen />
        <AccordionItem text="title 1" content="item 1" />
      </Accordion>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("<AccordionItem />", () => {
  it("doesn't render content by default", () => {
    render(<AccordionItem text="title" content="content" />);
    expect(screen.getByRole("button")).toHaveTextContent("title");
  });

  it("doesn't render content when defaultIsOpen=false", () => {
    render(
      <AccordionItem text="title" content="content" defaultIsOpen={false} />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("title");
  });

  it("renders content when defaultIsOpen=true", () => {
    render(
      <AccordionItem text="title" content="content" defaultIsOpen={true} />,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("toggles content after header click", async () => {
    render(<AccordionItem text="title" content="content" />);
    expect(screen.getByRole("button")).toHaveTextContent("title");

    const user = userEvent.setup();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("content")).toBeTruthy();

    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("content")).toBeFalsy();
  });
});
