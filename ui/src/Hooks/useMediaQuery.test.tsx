import { act, FC } from "react";

import { render, screen } from "@testing-library/react";

import { useMediaQuery } from "./useMediaQuery";

let matches: boolean;
let changeListener: (() => void) | undefined;
let removeEventListener: jest.Mock;

const Query: FC<{ query: string }> = ({ query }) => {
  const value = useMediaQuery(query);
  return <span data-testid="value">{String(value)}</span>;
};

beforeEach(() => {
  matches = false;
  changeListener = undefined;
  removeEventListener = jest.fn();
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches,
    addEventListener: (_: string, listener: () => void) => {
      changeListener = listener;
    },
    removeEventListener,
  })) as unknown as typeof window.matchMedia;
});

describe("useMediaQuery", () => {
  it("returns true for a matching query", () => {
    matches = true;
    render(<Query query="(prefers-color-scheme: dark)" />);
    expect(screen.getByTestId("value").textContent).toBe("true");
  });

  it("returns false for a query that does not match", () => {
    render(<Query query="(prefers-color-scheme: dark)" />);
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("updates when the query result changes", () => {
    render(<Query query="(prefers-color-scheme: dark)" />);
    expect(screen.getByTestId("value").textContent).toBe("false");

    matches = true;
    act(() => {
      changeListener?.();
    });
    expect(screen.getByTestId("value").textContent).toBe("true");
  });

  it("stops listening after unmount", () => {
    const { unmount } = render(<Query query="(prefers-color-scheme: dark)" />);
    unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});
