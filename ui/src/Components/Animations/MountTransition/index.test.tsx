import { act, startTransition, useState, FC, ReactNode } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";

import { ThemeContext } from "Components/Theme";
import { MockThemeContextWithoutAnimations } from "__fixtures__/Theme";
import { MountTransition } from ".";

// The jsdom environment has no View Transition API, so the browser method
// is mocked to run the update callback at once and resolve both lifecycle
// promises. This is enough to assert that React decided to start a view
// transition.
const startViewTransitionMock = jest.fn();

const mockViewTransitionAPI = () => {
  startViewTransitionMock.mockImplementation(
    (options: { update: () => void }) => {
      options.update();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      };
    },
  );
  (
    document as unknown as {
      startViewTransition: unknown;
    }
  ).startViewTransition = startViewTransitionMock;
  (
    document.documentElement as unknown as {
      getAnimations: () => Array<Animation>;
    }
  ).getAnimations = () => [];
};

const unmockViewTransitionAPI = () => {
  delete (
    document as unknown as {
      startViewTransition?: unknown;
    }
  ).startViewTransition;
  delete (
    document.documentElement as unknown as {
      getAnimations?: () => Array<Animation>;
    }
  ).getAnimations;
};

const Child = () => <div data-testid="child" />;

const TransitionToggle: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [show, setShow] = useState<boolean>(false);
  return (
    <>
      <button
        data-testid="toggle"
        onClick={() => startTransition(() => setShow((v) => !v))}
      >
        toggle
      </button>
      <MountTransition in={show} enter="auto" exit="auto">
        {children}
      </MountTransition>
    </>
  );
};

const store = makeAutoObservable({ visible: false });
const setVisible = action((visible: boolean) => {
  store.visible = visible;
});

const MobxSubject = observer(() => (
  <MountTransition in={store.visible} enter="auto" exit="auto">
    <Child />
  </MountTransition>
));

beforeEach(() => {
  mockViewTransitionAPI();
});

afterEach(() => {
  unmockViewTransitionAPI();
  jest.resetAllMocks();
  setVisible(false);
});

describe("<MountTransition />", () => {
  it("renders children when in=true on first render", () => {
    render(
      <MountTransition in={true}>
        <Child />
      </MountTransition>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders nothing when in=false", () => {
    render(
      <MountTransition in={false}>
        <Child />
      </MountTransition>,
    );
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("starts a view transition when a startTransition update mounts children", async () => {
    render(<TransitionToggle>{<Child />}</TransitionToggle>);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle"));
    await act(async () => {});

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
  });

  it("starts a view transition when a startTransition update unmounts children", async () => {
    render(<TransitionToggle>{<Child />}</TransitionToggle>);
    fireEvent.click(screen.getByTestId("toggle"));
    await act(async () => {});

    fireEvent.click(screen.getByTestId("toggle"));
    await act(async () => {});

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(startViewTransitionMock).toHaveBeenCalledTimes(2);
  });

  it("starts a view transition when a MobX store change mounts children", async () => {
    render(<MobxSubject />);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();

    await act(async () => {
      setVisible(true);
    });

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
  });

  it("starts a view transition when a MobX store change unmounts children", async () => {
    render(<MobxSubject />);
    await act(async () => {
      setVisible(true);
    });

    await act(async () => {
      setVisible(false);
    });

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(startViewTransitionMock).toHaveBeenCalledTimes(2);
  });

  it("renders children without a view transition when animations are disabled", async () => {
    render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <MobxSubject />
      </ThemeContext>,
    );
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();

    await act(async () => {
      setVisible(true);
    });

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(startViewTransitionMock).not.toHaveBeenCalled();
  });
});
