import React from "react";

import { mount } from "enzyme";

import { useFlashAnimation } from "./useFlashAnimation";

describe("useFlashAnimation", () => {
  const Component = ({ value, startCallback }) => {
    const [ref, animate] = useFlashAnimation(value);
    jest.spyOn(animate, "start").mockImplementation(startCallback);
    return <div ref={ref}>{value}</div>;
  };

  it("doesn't flash on mount", () => {
    const start = jest.fn();
    const tree = mount(<Component value={0} startCallback={start} />);
    expect(tree.text()).toBe("0");
    expect(start).not.toHaveBeenCalled();
  });

  it("flash on value change", () => {
    const start = jest.fn();
    const tree = mount(<Component value={0} startCallback={start} />);
    expect(tree.text()).toBe("0");
    expect(start).not.toHaveBeenCalled();

    tree.setProps({ value: 1 });
    expect(tree.text()).toBe("1");
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("unmounts cleanly", () => {
    const tree = mount(<Component value={0} startCallback={jest.fn()} />);
    tree.unmount();
  });
});
