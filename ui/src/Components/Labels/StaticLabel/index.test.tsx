import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";

import StaticLabel from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedStaticLabel = () => {
  return mount(<StaticLabel alertStore={alertStore} name="foo" value="bar" />);
};

describe("<StaticLabel />", () => {
  it("matches snapshot", () => {
    const tree = MountedStaticLabel();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("label with dark background color should have 'components-label-dark' class", () => {
    alertStore.data.colors["foo"] = {
      bar: {
        brightness: 125,
        background: "rgba(4,5,6,200)",
      },
    };
    const tree = MountedStaticLabel();
    expect(
      tree.find(".components-label").hasClass("components-label-dark")
    ).toBe(true);
  });

  it("label with bright background color should have 'components-label-bright' class", () => {
    alertStore.data.colors["foo"] = {
      bar: {
        brightness: 200,
        background: "rgba(4,5,6,200)",
      },
    };
    const tree = MountedStaticLabel();
    expect(
      tree.find(".components-label").hasClass("components-label-bright")
    ).toBe(true);
  });
});
