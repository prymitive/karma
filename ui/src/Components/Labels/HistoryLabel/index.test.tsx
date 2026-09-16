import { render, screen } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";

import HistoryLabel from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const renderHistoryLabel = (
  raw: string,
  name: string,
  matcher: string,
  value: string,
) => {
  return render(
    <HistoryLabel
      alertStore={alertStore}
      raw={raw}
      name={name}
      matcher={matcher}
      value={value}
    />,
  );
};

describe("<HistoryLabel />", () => {
  it("renders raw filter text", () => {
    renderHistoryLabel("foo=bar", "foo", "=", "bar");
    expect(screen.getByText("foo=bar")).toBeInTheDocument();
  });

  it("renders raw text for a fuzzy filter", () => {
    render(
      <HistoryLabel
        alertStore={alertStore}
        raw="foobar"
        name=""
        matcher="=~"
        value="(?i)foobar"
      />,
    );
    expect(screen.getByText("foobar")).toBeInTheDocument();
    expect(screen.queryByText("(?i)foobar")).not.toBeInTheDocument();
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
    renderHistoryLabel("foo=bar", "foo", "=", "bar");
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
    renderHistoryLabel("foo=bar", "foo", "=", "bar");
    expect(
      screen.getByText("foo=bar").closest(".components-label"),
    ).toHaveClass("components-label-bright");
  });
});
