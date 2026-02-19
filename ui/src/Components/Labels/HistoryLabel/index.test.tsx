import { render, screen } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";

import HistoryLabel from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const renderHistoryLabel = (name: string, matcher: string, value: string) => {
  return render(
    <HistoryLabel
      alertStore={alertStore}
      name={name}
      matcher={matcher}
      value={value}
    />,
  );
};

describe("<HistoryLabel />", () => {
  it("renders name, matcher and value if all are set", () => {
    renderHistoryLabel("foo", "=", "bar");
    expect(screen.getByText("foo=bar")).toBeInTheDocument();
  });

  it("renders only value if name is falsey", () => {
    render(
      <HistoryLabel alertStore={alertStore} name="" matcher="" value="bar" />,
    );
    expect(screen.getByText("bar")).toBeInTheDocument();
  });

  it("label with dark background color should have 'components-label-dark' class", () => {
    alertStore.data.setColors({
      foo: {
        bar: {
          brightness: 125,
          background: "rgba(4,5,6,200)",
        },
      },
      ...alertStore.data.colors,
    });
    renderHistoryLabel("foo", "=", "bar");
    expect(
      screen.getByText("foo=bar").closest(".components-label"),
    ).toHaveClass("components-label-dark");
  });

  it("label with bright background color should have 'components-label-bright' class", () => {
    alertStore.data.setColors({
      foo: {
        bar: {
          brightness: 200,
          background: "rgba(4,5,6,200)",
        },
      },
      ...alertStore.data.colors,
    });
    renderHistoryLabel("foo", "=", "bar");
    expect(
      screen.getByText("foo=bar").closest(".components-label"),
    ).toHaveClass("components-label-bright");
  });
});
