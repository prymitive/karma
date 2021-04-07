import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";

import HistoryLabel from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const ShallowHistoryLabel = (name: string, matcher: string, value: string) => {
  return shallow(
    <HistoryLabel
      alertStore={alertStore}
      name={name}
      matcher={matcher}
      value={value}
    />
  );
};

describe("<HistoryLabel />", () => {
  it("renders name, matcher and value if all are set", () => {
    const tree = ShallowHistoryLabel("foo", "=", "bar");
    expect(tree.text()).toBe("foo=bar");
  });

  it("renders only value if name is falsey", () => {
    const tree = shallow(
      <HistoryLabel alertStore={alertStore} name="" matcher="" value="bar" />
    );
    expect(tree.text()).toBe("bar");
  });

  it("label with dark background color should have 'components-label-dark' class", () => {
    alertStore.data.colors["foo"] = {
      bar: {
        brightness: 125,
        background: "rgba(4,5,6,200)",
      },
    };
    const tree = ShallowHistoryLabel("foo", "=", "bar").find(
      ".components-label"
    );
    expect(tree.hasClass("components-label-dark")).toBe(true);
  });

  it("label with bright background color should have 'components-label-bright' class", () => {
    alertStore.data.colors["foo"] = {
      bar: {
        brightness: 200,
        background: "rgba(4,5,6,200)",
      },
    };
    const tree = ShallowHistoryLabel("foo", "=", "bar").find(
      ".components-label"
    );
    expect(tree.hasClass("components-label-bright")).toBe(true);
  });
});
