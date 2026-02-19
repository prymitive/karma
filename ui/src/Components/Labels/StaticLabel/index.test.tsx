import { render } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";

import StaticLabel from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const renderStaticLabel = () => {
  return render(<StaticLabel alertStore={alertStore} name="foo" value="bar" />);
};

describe("<StaticLabel />", () => {
  it("matches snapshot", () => {
    const { asFragment } = renderStaticLabel();
    expect(asFragment()).toMatchSnapshot();
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
    const { container } = renderStaticLabel();
    expect(container.querySelector(".components-label")).toHaveClass(
      "components-label-dark",
    );
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
    const { container } = renderStaticLabel();
    expect(container.querySelector(".components-label")).toHaveClass(
      "components-label-bright",
    );
  });
});
