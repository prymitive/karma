import { FC, useRef, useState } from "react";
import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { useOnClickOutside } from "./useOnClickOutside";

describe("useOnClickOutside", () => {
  const Component: FC<{
    enabled: boolean;
  }> = ({ enabled }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
    useOnClickOutside(ref, () => setIsModalOpen(false), enabled);

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

  const NoRefComponent: FC = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
    useOnClickOutside(ref, () => setIsModalOpen(false), true);

    return isModalOpen ? <div>Open</div> : <div>Hidden</div>;
  };

  it("closes modal on click outside", () => {
    render(<Component enabled />);
    expect(screen.getByText("Open")).toBeInTheDocument();

    const clickEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("ignores events when hidden", () => {
    render(<Component enabled />);
    expect(screen.getByText("Open")).toBeInTheDocument();

    const clickEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    act(() => {
      document.dispatchEvent(clickEvent);
    });
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("modal stays open on click inside", () => {
    render(<Component enabled />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText("Open"));
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("only runs when enabled", () => {
    const { rerender } = render(<Component enabled={false} />);
    expect(screen.getByText("Open")).toBeInTheDocument();

    const clickEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(screen.getByText("Open")).toBeInTheDocument();

    rerender(<Component enabled={true} />);
    act(() => {
      document.dispatchEvent(clickEvent);
    });
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("ignores events when the ref has no node", () => {
    render(<NoRefComponent />);
    expect(screen.getByText("Open")).toBeInTheDocument();

    const clickEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(clickEvent);
    });
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("unmounts cleanly", () => {
    const { unmount } = render(<Component enabled />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    unmount();
  });
});
