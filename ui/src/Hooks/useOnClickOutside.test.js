import React, { useRef, useState } from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { useOnClickOutside } from "./useOnClickOutside";

describe("useOnClickOutside", () => {
  const Component = () => {
    const ref = useRef();
    const [isModalOpen, setModalOpen] = useState(true);
    useOnClickOutside(ref, () => setModalOpen(false));

    return (
      <div>
        {isModalOpen ? (
          <div ref={ref}>
            <span>Open</span>
          </div>
        ) : (
          <div>Hidden</div>
        )}
      </div>
    );
  };

  it("closes modal on click outside", () => {
    const tree = mount(<Component />);
    expect(tree.text()).toBe("Open");

    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent("mousedown", true, true);
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(tree.text()).toBe("Hidden");
  });

  it("ignores events when hidden", () => {
    const tree = mount(<Component />);
    expect(tree.text()).toBe("Open");

    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent("mousedown", true, true);
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    act(() => {
      document.dispatchEvent(clickEvent);
    });
    expect(tree.text()).toBe("Hidden");
  });

  it("modal stays open on click inside", () => {
    const tree = mount(<Component />);
    expect(tree.text()).toBe("Open");
    tree.find("span").simulate("click");
    expect(tree.text()).toBe("Open");
  });
});
