import { act, FC } from "react";

import { render, screen } from "@testing-library/react";

import { useIsMobile } from "./useIsMobile";

const IsMobile: FC = () => {
  const isMobile = useIsMobile();
  return <span data-testid="mobile">{String(isMobile)}</span>;
};

describe("useIsMobile", () => {
  it("returns false on desktop widths", () => {
    window.innerWidth = 1024;
    render(<IsMobile />);
    expect(screen.getByTestId("mobile").textContent).toBe("false");
  });

  it("returns true on mobile widths", () => {
    window.innerWidth = 500;
    render(<IsMobile />);
    expect(screen.getByTestId("mobile").textContent).toBe("true");
  });

  it("updates when the breakpoint is crossed", () => {
    window.innerWidth = 1024;
    render(<IsMobile />);
    expect(screen.getByTestId("mobile").textContent).toBe("false");

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("mobile").textContent).toBe("true");
  });
});
