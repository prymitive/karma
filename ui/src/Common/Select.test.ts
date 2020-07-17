import { NewLabelName, NewLabelValue } from "./Select";

describe("NewLabelName", () => {
  it("returns correct text", () => {
    expect(NewLabelName("foo")).toBe("New label: foo");
  });
});

describe("NewLabelValue", () => {
  it("returns correct text", () => {
    expect(NewLabelValue("foo")).toBe("New value: foo");
  });
});
