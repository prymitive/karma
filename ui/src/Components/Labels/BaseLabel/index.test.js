import React from "react";
import renderer from "react-test-renderer";

import { AlertStore } from "Stores/AlertStore";

import { BaseLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const FakeBaseLabel = () => {
  // BaseLabel doesn't implement render since it's an abstract component
  // Add a dummy implementation for testing
  class RenderableBaseLabel extends BaseLabel {
    render() {
      return null;
    }
  }
  return renderer.create(
    <RenderableBaseLabel alertStore={alertStore} name="foo" value="bar" />
  );
};

describe("<BaseLabel />", () => {
  it("isStaticColorLabel() returns true for labels present in staticColorLabels", () => {
    alertStore.settings.values.staticColorLabels = ["foo", "job", "bar"];
    const instance = FakeBaseLabel().getInstance();
    expect(instance.isStaticColorLabel("job")).toBeTruthy();
  });

  it("isStaticColorLabel() returns false for labels not present in staticColorLabels", () => {
    alertStore.settings.values.staticColorLabels = ["foo"];
    const instance = FakeBaseLabel().getInstance();
    expect(instance.isStaticColorLabel("job")).toBeFalsy();
  });

  it("getColorClass() on a label included in staticColorLabels should return 'info'", () => {
    alertStore.settings.values.staticColorLabels = ["job"];
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorClass("job", "foo")).toBe("info");
  });

  it("getColorClass() on a label without any special color should return 'warning'", () => {
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorClass("foo", "bar")).toBe("warning");
  });

  it("getColorClass() on 'alertname' label should return 'dark'", () => {
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorClass("alertname", "foo")).toBe("dark");
  });

  it("getColorStyle() on a label included in staticColorLabels should be empty", () => {
    alertStore.settings.values.staticColorLabels = ["job"];
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorStyle("job", "bar")).toMatchObject({});
  });

  it("getColorStyle() on a label without any color information should be empty", () => {
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorStyle("foo", "bar")).toMatchObject({});
  });

  it("getColorStyle() on a label with color information should be correctly formatted", () => {
    alertStore.data.colors["foo"] = {
      bar: {
        font: { red: 1, green: 2, blue: 3, alpha: 100 },
        background: { red: 4, green: 5, blue: 6, alpha: 200 }
      }
    };
    const instance = FakeBaseLabel().getInstance();
    expect(instance.getColorStyle("foo", "bar")).toMatchObject({
      color: "rgba(1, 2, 3, 100)",
      backgroundColor: "rgba(4, 5, 6, 200)"
    });
  });
});
