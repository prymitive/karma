import { AlertStore } from "Stores/AlertStore";
import {
  StaticColorLabelClassMap,
  DefaultLabelClassMap,
  AlertNameLabelClassMap,
  StateLabelClassMap,
} from "Common/Colors";
import { GetClassAndStyle } from "./Utils";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

describe("<GetClassAndStyle />", () => {
  it("static label uses StaticColorLabelClassMap.badge", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ staticColorLabels: ["foo", "job", "bar"] },
    });
    const cs = GetClassAndStyle(alertStore, "foo", "bar");
    expect(cs.colorClassNames).toContain(StaticColorLabelClassMap.badge);
  });

  Object.entries(StaticColorLabelClassMap).map(([key, _]) =>
    it(`non-static label doesn't use StaticColorLabelClassMap.${key}`, () => {
      alertStore.settings.setValues({
        ...alertStore.settings.values,
        ...{ staticColorLabels: [] },
      });
      const cs = GetClassAndStyle(alertStore, "foo", "bar");
      expect(cs.colorClassNames).not.toContain(StaticColorLabelClassMap.badge);
    })
  );

  it("label with no special color information should use DefaultLabelClassMap.badge", () => {
    const cs = GetClassAndStyle(alertStore, "foo", "bar");
    expect(cs.colorClassNames).toContain(DefaultLabelClassMap.badge);
  });

  it("alertname label should use AlertNameLabelClassMap.badge", () => {
    const cs = GetClassAndStyle(alertStore, "alertname", "foo");
    expect(cs.colorClassNames).toContain(AlertNameLabelClassMap.badge);
  });

  it("@state=active label should use StateLabelClassMap.active class", () => {
    const cs = GetClassAndStyle(alertStore, "@state", "active");
    expect(cs.colorClassNames).toContain(
      `bg-${StateLabelClassMap.active} text-white`
    );
  });

  it("@state=suppressed label should use StateLabelClassMap.suppressed class", () => {
    const cs = GetClassAndStyle(alertStore, "@state", "suppressed");
    expect(cs.colorClassNames).toContain(
      `bg-${StateLabelClassMap.suppressed} text-white`
    );
  });

  it("@state=unprocessed label should use StateLabelClassMap.unprocessed class", () => {
    const cs = GetClassAndStyle(alertStore, "@state", "unprocessed");
    expect(cs.colorClassNames).toContain(
      `bg-${StateLabelClassMap.unprocessed} text-white`
    );
  });

  it("@state with unknown label should use DefaultLabelClassMap.badge", () => {
    const cs = GetClassAndStyle(alertStore, "@state", "foobar");
    expect(cs.colorClassNames).toContain(DefaultLabelClassMap.badge);
  });

  it("style prop on a label included in staticColorLabels should be empty", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ staticColorLabels: ["foo", "job", "bar"] },
    });
    const cs = GetClassAndStyle(alertStore, "foo", "bar");
    expect(cs.style).toEqual({});
  });

  it("style prop on a label without any color information should be empty", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ staticColorLabels: [] },
    });
    const cs = GetClassAndStyle(alertStore, "foo", "bar");
    expect(cs.style).toEqual({});
  });
});
