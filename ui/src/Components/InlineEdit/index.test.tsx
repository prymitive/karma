import { act } from "react-dom/test-utils";

import { render, screen, fireEvent } from "@testing-library/react";

import { InlineEdit } from ".";

describe("<InlineEdit />", () => {
  it("renders span by default", () => {
    render(<InlineEdit value="foo" onChange={jest.fn()} />);
    expect(screen.getByText("foo")).toBeInTheDocument();
    expect(screen.getByText("foo").tagName).toBe("SPAN");
  });

  it("renders input after click", () => {
    render(<InlineEdit value="foo" onChange={jest.fn()} />);
    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("foo");
  });

  it("edit mode start calls onEnterEditing", () => {
    const onEnterEditing = jest.fn();
    render(
      <InlineEdit
        value="foo"
        onChange={jest.fn()}
        onEnterEditing={onEnterEditing}
      />,
    );

    expect(onEnterEditing).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onEnterEditing).toHaveBeenCalled();
  });

  it("edit mode finish calls onExitEditing", () => {
    const onExitEditing = jest.fn();
    render(
      <div id="root">
        <button>click me</button>
        <InlineEdit
          value="foo"
          onChange={jest.fn()}
          onExitEditing={onExitEditing}
        />
      </div>,
    );

    expect(onExitEditing).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("foo"));
    expect(onExitEditing).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new Event("mousedown"));
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onExitEditing).toHaveBeenCalled();
  });

  it("cancels edits after click outside", () => {
    render(
      <div id="root">
        <button>click me</button>
        <InlineEdit value="foo" onChange={jest.fn()} />
      </div>,
    );

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(new Event("mousedown"));
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("typing in the input changes value", () => {
    render(<InlineEdit value="foo" onChange={jest.fn()} />);

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "bar" } });
    expect(screen.getByRole("textbox")).toHaveValue("bar");
  });

  it("enter calls onChange if value was edited", () => {
    const onChange = jest.fn();
    render(<InlineEdit value="foo" onChange={onChange} />);

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "bar" } });
    expect(screen.getByRole("textbox")).toHaveValue("bar");

    fireEvent.keyDown(screen.getByRole("textbox"), { keyCode: 13 });
    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("enter doesn't call onChange if value was not edited", () => {
    const onChange = jest.fn();
    render(<InlineEdit value="foo" onChange={onChange} />);

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox"), { keyCode: 13 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("esc cancels edit mode", () => {
    const onChange = jest.fn();
    render(<InlineEdit value="foo" onChange={onChange} />);

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox"), { keyCode: 27 });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("unknown keyDown does nothing", () => {
    const onChange = jest.fn();
    render(<InlineEdit value="foo" onChange={onChange} />);

    fireEvent.click(screen.getByText("foo"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox"), { keyCode: 45 });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
