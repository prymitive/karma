import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import {
  StaticColorLabelClassMap,
  DefaultLabelClassMap,
  AlertNameLabelClassMap,
  StateLabelClassMap,
} from "Common/Colors";
import { BaseLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const FakeBaseLabel = (name = "foo", value = "bar") => {
  class RenderableBaseLabel extends BaseLabel {
    render() {
      const { name, value } = this.props;
      let cs = this.getClassAndStyle(name, value);
      return (
        <span className={cs.className} style={cs.style}>
          <span className="components-label-name">{name}:</span>{" "}
          <span className="components-label-value">{value}</span>
        </span>
      );
    }
  }
  return shallow(
    <RenderableBaseLabel alertStore={alertStore} name={name} value={value} />
  );
};

describe("<BaseLabel />", () => {
  it("static label uses StaticColorLabelClassMap.badge", () => {
    alertStore.settings.values.staticColorLabels = ["foo", "job", "bar"];
    const tree = FakeBaseLabel();
    expect(
      tree.find(".components-label").hasClass(StaticColorLabelClassMap.badge)
    ).toBe(true);
  });

  Object.entries(StaticColorLabelClassMap).map(([key, val]) =>
    it(`non-static label doesn't use StaticColorLabelClassMap.${key}`, () => {
      alertStore.settings.values.staticColorLabels = [];
      const tree = FakeBaseLabel();
      expect(tree.find(".components-label").hasClass(val)).toBe(false);
    })
  );

  it("label with no special color information should use DefaultLabelClassMap.badge", () => {
    const tree = FakeBaseLabel();
    expect(
      tree.find(".components-label").hasClass(DefaultLabelClassMap.badge)
    ).toBe(true);
  });

  it("alertname label should use AlertNameLabelClassMap.badge", () => {
    const tree = FakeBaseLabel("alertname", "foo");
    expect(
      tree.find(".components-label").hasClass(AlertNameLabelClassMap.badge)
    ).toBe(true);
  });

  it("@state=active label should use StateLabelClassMap.active class", () => {
    const tree = FakeBaseLabel("@state", "active");
    expect(
      tree
        .find(".components-label")
        .hasClass(`badge-${StateLabelClassMap.active}`)
    ).toBe(true);
  });

  it("@state=suppressed label should use StateLabelClassMap.suppressed class", () => {
    const tree = FakeBaseLabel("@state", "suppressed");
    expect(
      tree
        .find(".components-label")
        .hasClass(`badge-${StateLabelClassMap.suppressed}`)
    ).toBe(true);
  });

  it("@state=unprocessed label should use StateLabelClassMap.unprocessed class", () => {
    const tree = FakeBaseLabel("@state", "unprocessed");
    expect(
      tree
        .find(".components-label")
        .hasClass(`badge-${StateLabelClassMap.unprocessed}`)
    ).toBe(true);
  });

  it("@state with unknown label should use DefaultLabelClassMap.badge", () => {
    const tree = FakeBaseLabel("@state", "foobar");
    expect(
      tree.find(".components-label").hasClass(DefaultLabelClassMap.badge)
    ).toBe(true);
  });

  it("style prop on a label included in staticColorLabels should be empty", () => {
    alertStore.settings.values.staticColorLabels = ["foo", "job", "bar"];
    const tree = FakeBaseLabel();
    expect(tree.find(".components-label").props().style).toEqual({});
  });

  it("style prop on a label without any color information should be empty", () => {
    alertStore.settings.values.staticColorLabels = [];
    const tree = FakeBaseLabel();
    expect(tree.find(".components-label").props().style).toEqual({});
  });
});
