import { FC, useRef, useState } from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { useOnClickOutside } from "./useOnClickOutside";

describe("useOnClickOutside", () => {
  const Component: FC<{
    enabled: boolean;
  }> = ({ enabled }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [isModalOpen, setModalOpen] = useState<boolean>(true);
    useOnClickOutside(ref, () => setModalOpen(false), enabled);

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
    const tree = mount(<Component enabled />);
    expect(tree.text()).toBe("Open");

    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent("mousedown", true, true);
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(tree.text()).toBe("Hidden");
  });

  it("ignores events when hidden", () => {
    const tree = mount(<Component enabled />);
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
    const tree = mount(<Component enabled />);
    expect(tree.text()).toBe("Open");
    tree.find("span").simulate("click");
    expect(tree.text()).toBe("Open");
  });

  it("only runs when enabled", () => {
    const tree = mount(<Component enabled={false} />);
    expect(tree.text()).toBe("Open");

    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent("mousedown", true, true);
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(tree.text()).toBe("Open");

    tree.setProps({ enabled: true });
    act(() => {
      document.dispatchEvent(clickEvent);
    });
    expect(tree.text()).toBe("Hidden");
  });

  it("unmounts cleanly", () => {
    const tree = mount(<Component enabled />);
    expect(tree.text()).toBe("Open");
    tree.unmount();
  });
});
