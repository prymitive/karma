import { render, screen, fireEvent } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.info.setVersion("1.2.3");
});

describe("<ToastMessage />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <ToastMessage title="title string" message={<div>Div Message</div>} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("<UpgradeToastMessage />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <UpgradeToastMessage alertStore={alertStore} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("clicking on the stop button pauses page reload", () => {
    const { container } = render(
      <UpgradeToastMessage alertStore={alertStore} />,
    );
    const button = screen.getByRole("button");
    expect(container.querySelector("svg.fa-stop")).toBeInTheDocument();
    expect(button.textContent).toBe("Stop auto-reload");

    fireEvent.click(button);
    expect(container.querySelector("svg.fa-arrows-rotate")).toBeInTheDocument();
    expect(button.textContent).toBe("Reload now");
  });

  it("clicking on the reload buton triggers a reload", () => {
    render(<UpgradeToastMessage alertStore={alertStore} />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(button.textContent).toBe("Reload now");

    fireEvent.click(button);
    expect(alertStore.info.upgradeNeeded).toBe(true);
  });

  it("upgradeNeeded=true after onAnimationEnd is called", () => {
    const { container } = render(
      <UpgradeToastMessage alertStore={alertStore} />,
    );
    const progressbar = container.querySelector(
      "div.toast-upgrade-progressbar",
    );
    fireEvent.animationEnd(progressbar!);
    expect(alertStore.info.upgradeNeeded).toBe(true);
  });
});
