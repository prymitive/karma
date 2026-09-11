import { act, useState, FC, ReactNode } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { ThemeContext } from "Components/Theme";
import { MockThemeContextWithoutAnimations } from "__fixtures__/Theme";
import { MountTransition } from ".";

const Child = () => <div data-testid="child" />;

const TransitionToggle: FC<{ children: ReactNode }> = ({ children }) => {
  const [show, setShow] = useState<boolean>(false);
  return (
    <>
      <button data-testid="toggle" onClick={() => setShow((v) => !v)}>
        toggle
      </button>
      <MountTransition
        in={show}
        enter="components-animation-slide-enter"
        exit="components-animation-slide-exit"
      >
        {children}
      </MountTransition>
    </>
  );
};

afterEach(() => {
  jest.useRealTimers();
});

describe("<MountTransition />", () => {
  it("renders children inside a wrapper with the enter class when in=true", () => {
    render(
      <MountTransition
        in={true}
        enter="components-animation-slide-enter"
        exit="components-animation-slide-exit"
      >
        <Child />
      </MountTransition>,
    );
    expect(
      document.querySelector(
        ".components-animation-slide-enter > [data-testid='child']",
      ),
    ).toBeInTheDocument();
  });

  it("renders nothing when in=false", () => {
    render(
      <MountTransition in={false}>
        <Child />
      </MountTransition>,
    );
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("keeps children mounted with the exit class until the exit animation is done", () => {
    jest.useFakeTimers();
    render(
      <TransitionToggle>
        <Child />
      </TransitionToggle>,
    );

    fireEvent.click(screen.getByTestId("toggle"));
    expect(screen.getByTestId("child")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle"));
    expect(
      document.querySelector(
        ".components-animation-slide-exit > [data-testid='child']",
      ),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("renders children without an animation class and unmounts at once when animations are disabled", () => {
    render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <TransitionToggle>
          <Child />
        </TransitionToggle>
      </ThemeContext>,
    );

    fireEvent.click(screen.getByTestId("toggle"));
    expect(screen.getByTestId("child").parentElement?.className).toBe(
      "components-animation-mount",
    );

    fireEvent.click(screen.getByTestId("toggle"));
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });
});
