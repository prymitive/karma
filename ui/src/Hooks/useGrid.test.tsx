import { FC, Ref } from "react";

import { renderHook } from "@testing-library/react-hooks";

import { mount } from "enzyme";

import { useGrid } from "./useGrid";

const sizes = [{ columns: 2, gutter: 0 }];

const Component: FC<{ count: number }> = ({ count }) => {
  const { ref, repack } = useGrid(sizes);
  return (
    <div ref={ref as Ref<any>} id="root" onClick={repack}>
      {Array.from(Array(count).keys()).map((i) => (
        <div key={i} id={`item${i}`} style={{ width: 400 }}></div>
      ))}
    </div>
  );
};

describe("useGrid", () => {
  it("does nothing if ref is null", () => {
    const { result } = renderHook(() => useGrid([]));
    expect(result.current.ref).toMatchObject({ current: null });
  });

  it("repack does nothing if ref is null", () => {
    const { result } = renderHook(() => useGrid([]));
    expect(result.current.ref).toMatchObject({ current: null });
    result.current.repack();
  });

  it("packs grid if ref is set", () => {
    const tree = mount(<Component count={4} />);
    expect(tree.find("#item0").html()).toMatch(/data-packed/);
    expect(tree.find("#item1").html()).toMatch(/data-packed/);
    expect(tree.find("#item2").html()).toMatch(/data-packed/);
    expect(tree.find("#item3").html()).toMatch(/data-packed/);
  });

  it("repack will repack the grid if ref is set", () => {
    const tree = mount(<Component count={4} />);
    expect(tree.find("#item0").html()).toMatch(/data-packed/);
    expect(tree.find("#item1").html()).toMatch(/data-packed/);
    expect(tree.find("#item2").html()).toMatch(/data-packed/);
    expect(tree.find("#item3").html()).toMatch(/data-packed/);

    tree.setProps({ count: 5 });
    expect(tree.find("#item4").html()).not.toMatch(/data-packed/);

    tree.find("#root").simulate("click");
    expect(tree.find("#item4").html()).toMatch(/data-packed/);
  });

  it("unmounts cleanly", () => {
    const tree = mount(<Component count={4} />);
    tree.unmount();
  });

  it("repack after unmount does nothing", () => {
    const tree = mount(<Component count={4} />);
    const repack = tree.find("#root").props().onClick;
    tree.unmount();
    (repack as () => void)();
  });
});
