import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import {
  StaticColorLabelClass,
  DefaultLabelClass,
  AlertNameLabelClass,
  StateLabelClassMap
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
  it("static label uses StaticColorLabelClass", () => {
    alertStore.settings.values.staticColorLabels = ["foo", "job", "bar"];
    const tree = FakeBaseLabel();
    expect(tree.find(".components-label").hasClass(StaticColorLabelClass)).toBe(
      true
    );
  });

  it("non-static label doesn't use StaticColorLabelClass", () => {
    alertStore.settings.values.staticColorLabels = [];
    const tree = FakeBaseLabel();
    expect(tree.find(".components-label").hasClass(StaticColorLabelClass)).toBe(
      false
    );
  });

  it("label with no special color information should use DefaultLabelClass", () => {
    const tree = FakeBaseLabel();
    expect(tree.find(".components-label").hasClass(DefaultLabelClass)).toBe(
      true
    );
  });

  it("alertname label should use AlertNameLabelClass", () => {
    const tree = FakeBaseLabel("alertname", "foo");
    expect(tree.find(".components-label").hasClass(AlertNameLabelClass)).toBe(
      true
    );
  });

  it("@state=active label should use StateLabelClassMap.active class", () => {
    const tree = FakeBaseLabel("@state", "active");
    expect(
      tree.find(".components-label").hasClass(StateLabelClassMap.active)
    ).toBe(true);
  });

  it("@state=suppressed label should use StateLabelClassMap.suppressed class", () => {
    const tree = FakeBaseLabel("@state", "suppressed");
    expect(
      tree.find(".components-label").hasClass(StateLabelClassMap.suppressed)
    ).toBe(true);
  });

  it("@state=unprocessed label should use StateLabelClassMap.unprocessed class", () => {
    const tree = FakeBaseLabel("@state", "unprocessed");
    expect(
      tree.find(".components-label").hasClass(StateLabelClassMap.unprocessed)
    ).toBe(true);
  });

  it("@state with unknown label should use DefaultLabelClass", () => {
    const tree = FakeBaseLabel("@state", "foobar");
    expect(tree.find(".components-label").hasClass(DefaultLabelClass)).toBe(
      true
    );
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
