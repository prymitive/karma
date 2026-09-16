import { act, FC } from "react";

import { render, screen } from "@testing-library/react";

import { useWindowSize } from "./useWindowSize";

const Size: FC = () => {
  const { width, height } = useWindowSize();
  return <span data-testid="size">{`${width}x${height}`}</span>;
};

const setSize = (width: number, height: number) => {
  window.innerWidth = width;
  window.innerHeight = height;
};

describe("useWindowSize", () => {
  it("returns the window size", () => {
    setSize(800, 600);
    render(<Size />);
    expect(screen.getByTestId("size").textContent).toBe("800x600");
  });

  it("updates on resize", () => {
    setSize(1024, 768);
    render(<Size />);
    act(() => {
      setSize(500, 400);
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("size").textContent).toBe("500x400");
  });

  it("keeps one snapshot while more components subscribe", () => {
    setSize(800, 600);
    const { rerender } = render(<Size />);
    expect(screen.getByTestId("size").textContent).toBe("800x600");

    setSize(500, 400);
    rerender(
      <>
        <Size />
        <Size />
      </>,
    );
    expect(
      screen.getAllByTestId("size").map((node) => node.textContent),
    ).toEqual(["800x600", "800x600"]);

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(
      screen.getAllByTestId("size").map((node) => node.textContent),
    ).toEqual(["500x400", "500x400"]);
  });

  it("shares one resize listener between all subscribers", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    render(
      <>
        <Size />
        <Size />
      </>,
    );
    const resizeCalls = addEventListenerSpy.mock.calls.filter(
      ([name]) => name === "resize",
    );
    expect(resizeCalls).toHaveLength(1);
    addEventListenerSpy.mockRestore();
  });

  it("removes the listener after the last subscriber unmounts", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<Size />);
    unmount();
    const resizeCalls = removeEventListenerSpy.mock.calls.filter(
      ([name]) => name === "resize",
    );
    expect(resizeCalls).toHaveLength(1);
    removeEventListenerSpy.mockRestore();
  });
});
