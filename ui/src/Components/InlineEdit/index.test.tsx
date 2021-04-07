import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { InlineEdit } from ".";

describe("<InlineEdit />", () => {
  it("renders span by default", () => {
    const tree = mount(<InlineEdit value="foo" onChange={jest.fn()} />);
    expect(tree.html()).toBe('<span tabindex="0">foo</span>');
  });

  it("renders input after click", () => {
    const tree = mount(<InlineEdit value="foo" onChange={jest.fn()} />);
    tree.simulate("click");
    expect(tree.html()).toBe('<input type="text" size="4" value="foo">');
  });

  it("edit mode start calls onEnterEditing", () => {
    const onEnterEditing = jest.fn();
    const tree = mount(
      <InlineEdit
        value="foo"
        onChange={jest.fn()}
        onEnterEditing={onEnterEditing}
      />
    );

    expect(onEnterEditing).not.toHaveBeenCalled();

    tree.simulate("click");
    expect(tree.html()).toBe('<input type="text" size="4" value="foo">');
    expect(onEnterEditing).toHaveBeenCalled();
  });

  it("edit mode finish calls onExitEditing", () => {
    const onExitEditing = jest.fn();
    const tree = mount(
      <div id="root">
        <button>click me</button>
        <InlineEdit
          value="foo"
          onChange={jest.fn()}
          onExitEditing={onExitEditing}
        />
      </div>
    );

    expect(onExitEditing).not.toHaveBeenCalled();

    tree.find("span").simulate("click");
    expect(onExitEditing).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(
        new Event("mousedown", {
          target: tree.find("button").getDOMNode(),
        } as EventInit)
      );
    });
    expect(tree.html()).not.toMatch(/<input/);
    expect(onExitEditing).toHaveBeenCalled();
  });

  it("cancels edits after click outside", () => {
    const tree = mount(
      <div id="root">
        <button>click me</button>
        <InlineEdit value="foo" onChange={jest.fn()} />
      </div>
    );

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    act(() => {
      document.dispatchEvent(
        new Event("mousedown", {
          target: tree.find("button").getDOMNode(),
        } as EventInit)
      );
    });
    expect(tree.html()).not.toMatch(/<input/);
  });

  it("typing in the input changes value", () => {
    const tree = mount(<InlineEdit value="foo" onChange={jest.fn()} />);

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    tree.simulate("change", { target: { value: "bar" } });
    expect(tree.html()).toBe('<input type="text" size="4" value="bar">');
  });

  it("enter calls onChange if value was edited", () => {
    const onChange = jest.fn();
    const tree = mount(<InlineEdit value="foo" onChange={onChange} />);

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    tree.simulate("change", { target: { value: "bar" } });
    expect(tree.html()).toBe('<input type="text" size="4" value="bar">');

    tree.simulate("keyDown", { keyCode: 13 });
    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("enter doesn't call onChange if value was not edited", () => {
    const onChange = jest.fn();
    const tree = mount(<InlineEdit value="foo" onChange={onChange} />);

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    tree.simulate("keyDown", { keyCode: 13 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("esc cancels edit mode", () => {
    const onChange = jest.fn();
    const tree = mount(<InlineEdit value="foo" onChange={onChange} />);

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    tree.simulate("keyDown", { keyCode: 27 });
    expect(tree.html()).not.toMatch(/<input/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("unknown keyDown does nothing", () => {
    const onChange = jest.fn();
    const tree = mount(<InlineEdit value="foo" onChange={onChange} />);

    tree.find("span").simulate("click");
    expect(tree.html()).toMatch(/<input/);

    tree.simulate("keyDown", { keyCode: 45 });
    expect(tree.html()).toMatch(/<input/);
    expect(onChange).not.toHaveBeenCalled();
  });
});
