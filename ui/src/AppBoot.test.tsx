import { DefaultsBase64, DefaultsObject } from "__fixtures__/Defaults";
import {
  SettingsElement,
  ParseDefaultFilters,
  ParseUIDefaults,
} from "./AppBoot";

afterEach(() => {
  jest.restoreAllMocks();

  // https://github.com/jamesmfriedman/rmwc/issues/103#issuecomment-360007979
  Object.defineProperty(window.HTMLElement.prototype, "dataset", {
    writable: true,
    value: {},
  });
});

const MockSettings = (defaultFilters: string[]) => {
  return jest.spyOn(document, "getElementById").mockImplementation(() => {
    const filtersBase64 = btoa(JSON.stringify(defaultFilters));
    const settings = document.createElement("span");
    settings.id = "settings";
    (settings as any).dataset = {
      defaultFiltersBase64: filtersBase64,
    };
    return settings;
  });
};

const FiltersSetting = (filters: any) => {
  const settings = document.createElement("span");
  (settings as any).dataset = {
    defaultFiltersBase64: btoa(JSON.stringify(filters)),
  };
  return ParseDefaultFilters(settings);
};

describe("SettingsElement()", () => {
  it("returns null when '#settings' is missing", () => {
    const settings = SettingsElement();
    expect(settings).toBeNull();
  });

  it("returns correct span when '#settings' is present", () => {
    const spy = MockSettings([]);
    const settings = SettingsElement();
    expect(spy).toHaveBeenCalledTimes(1);
    expect((settings as any).id).toBe("settings");
  });
});

describe("ParseDefaultFilters()", () => {
  it("returns [] on missing filters attr", () => {
    const settings = document.createElement("span");
    (settings as any).dataset = {};
    expect(ParseDefaultFilters(settings)).toHaveLength(0);
  });

  it("returns [] on empty filters attr", () => {
    const settings = document.createElement("span");
    (settings as any).dataset = { defaultFiltersBase64: "" };
    expect(ParseDefaultFilters(settings)).toHaveLength(0);
  });

  it("returns decoded filters", () => {
    const filters = FiltersSetting(["foo=bar", "bar=~baz"]);
    expect(filters).toHaveLength(2);
    expect(filters).toContain("foo=bar");
    expect(filters).toContain("bar=~baz");
  });

  it("returns [] on filters attr that decodes to an object instead of an array", () => {
    const filters = FiltersSetting({ foo: "bar" });
    expect(filters).toHaveLength(0);
  });

  it("returns [] on filters attr that decodes to a string instead of an array", () => {
    const filters = FiltersSetting("foo=bar");
    expect(filters).toHaveLength(0);
  });

  it("ignores template placeholder values", () => {
    // Scenario: default filters attribute rendered with the literal template placeholder should be ignored
    const settings = document.createElement("span");
    (settings as any).dataset = {
      defaultFiltersBase64: "{{ .DefaultFilter }}",
    };
    expect(ParseDefaultFilters(settings)).toHaveLength(0);
  });
});

describe("ParseUIDefaults()", () => {
  it("parses base64 encoded JSON with defaults", () => {
    const uiDefaults = ParseUIDefaults({
      innerHTML: DefaultsBase64,
    } as HTMLElement);
    expect(uiDefaults).toStrictEqual(DefaultsObject);
  });

  it("returns null on null element", () => {
    const uiDefaults = ParseUIDefaults(null);
    expect(uiDefaults).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    const uiDefaults = ParseUIDefaults({
      innerHTML: "e3h4eC9mZgo=",
    } as HTMLElement);
    expect(uiDefaults).toBeNull();
  });

  it("returns null when base64 decoding fails", () => {
    // Scenario: malformed base64 input results in an exception during decoding
    const atobSpy = jest.spyOn(window, "atob").mockImplementation(() => {
      throw new Error("boom");
    });
    const uiDefaults = ParseUIDefaults({
      innerHTML: "###",
    } as HTMLElement);
    expect(uiDefaults).toBeNull();
    atobSpy.mockRestore();
  });
});
