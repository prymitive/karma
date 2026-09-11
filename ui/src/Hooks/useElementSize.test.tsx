import { act, FC } from "react";

import { render, screen, renderHook } from "@testing-library/react";

import { useElementSize } from "./useElementSize";

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  callback: ResizeObserverCallback;
  observe = jest.fn();
  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  trigger(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

const Size: FC = () => {
  const { ref, width, height } = useElementSize();
  return (
    <div ref={ref}>
      <span data-testid="size">{`${width}x${height}`}</span>
    </div>
  );
};

beforeEach(() => {
  ResizeObserverMock.instances = [];
  global.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
});

describe("useElementSize", () => {
  it("starts at zero size", () => {
    render(<Size />);
    expect(screen.getByTestId("size").textContent).toBe("0x0");
  });

  it("observes the element it is attached to", () => {
    render(<Size />);
    expect(ResizeObserverMock.instances).toHaveLength(1);
    expect(ResizeObserverMock.instances[0].observe).toHaveBeenCalledTimes(1);
  });

  it("measures the element when it resizes", () => {
    render(<Size />);
    act(() => {
      ResizeObserverMock.instances[0].trigger(100, 200);
    });
    expect(screen.getByTestId("size").textContent).toBe("100x200");
  });

  it("keeps the measured size when the element does not change", () => {
    render(<Size />);
    act(() => {
      ResizeObserverMock.instances[0].trigger(100, 200);
    });
    act(() => {
      ResizeObserverMock.instances[0].trigger(100, 200);
    });
    expect(screen.getByTestId("size").textContent).toBe("100x200");
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Size />);
    unmount();
    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("tolerates a null node", () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.ref(null)).toBeUndefined();
  });
});
