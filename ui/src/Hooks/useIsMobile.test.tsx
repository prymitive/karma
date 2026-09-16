import { act, FC } from "react";

import { render, screen } from "@testing-library/react";

import { useIsMobile } from "./useIsMobile";

let matches: boolean;
let changeListener: (() => void) | undefined;

const IsMobile: FC = () => {
  const isMobile = useIsMobile();
  return <span data-testid="mobile">{String(isMobile)}</span>;
};

beforeEach(() => {
  matches = false;
  changeListener = undefined;
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query === "(max-width: 767px)" ? matches : false,
    addEventListener: (_: string, listener: () => void) => {
      changeListener = listener;
    },
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useIsMobile", () => {
  it("returns false when the mobile media query does not match", () => {
    // Use the desktop result from the media query.
    render(<IsMobile />);

    expect(screen.getByTestId("mobile").textContent).toBe("false");
  });

  it("returns true when the mobile media query matches", () => {
    // Set the media query result before the hook subscribes.
    matches = true;
    render(<IsMobile />);

    expect(screen.getByTestId("mobile").textContent).toBe("true");
  });

  it("updates when the mobile media query result changes", () => {
    // Notify the hook through the media query listener.
    render(<IsMobile />);
    expect(screen.getByTestId("mobile").textContent).toBe("false");

    matches = true;
    act(() => {
      changeListener?.();
    });

    expect(screen.getByTestId("mobile").textContent).toBe("true");
  });

  it("does not subscribe to window resize events", () => {
    // Height changes must not notify mobile-status consumers.
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    render(<IsMobile />);

    const resizeListeners = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "resize",
    );
    expect(resizeListeners).toHaveLength(0);
  });
});
