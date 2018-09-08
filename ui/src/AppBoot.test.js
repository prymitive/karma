import { SettingsElement, SetupRaven, ParseDefaultFilters } from "./AppBoot";

const MockSettings = (version, ravenDsn, defaultFilters) => {
  return jest.spyOn(document, "getElementById").mockImplementation(() => {
    const filtersBase64 = btoa(JSON.stringify(defaultFilters));
    const settings = document.createElement("span");
    settings.id = "settings";
    settings.dataset = {
      version: version,
      ravenDsn: ravenDsn,
      defaultFiltersBase64: filtersBase64
    };
    return settings;
  });
};

const RavenClient = (ravenDsn, version) => {
  const settings = document.createElement("span");
  settings.dataset = { ravenDsn: ravenDsn, version: version };
  return SetupRaven(settings);
};

const FiltersSetting = filters => {
  const settings = document.createElement("span");
  settings.dataset = { defaultFiltersBase64: btoa(JSON.stringify(filters)) };
  return ParseDefaultFilters(settings);
};

describe("SettingsElement()", () => {
  it("returns null when '#settings' is missing", () => {
    const settings = SettingsElement();
    expect(settings).toBeNull();
  });

  it("returns correct span when '#settings' is present", () => {
    const spy = MockSettings("ver1", "fakeDSN", []);
    const settings = SettingsElement();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(settings.id).toBe("settings");
    expect(settings.dataset.version).toBe("ver1");
    expect(settings.dataset.ravenDsn).toBe("fakeDSN");
  });
});

describe("SetupRaven()", () => {
  it("does nothing when raven DSN is missing", () => {
    const client = RavenClient("");
    expect(client).toBeNull();
  });

  it("configures raven when DSN is present", () => {
    const client = RavenClient("https://key@example.com/mock");
    expect(client.isSetup()).toBeTruthy();
    expect(client._dsn).toBe("https://key@example.com/mock");
  });

  it("passes release option when version attr is present", () => {
    const client = RavenClient("https://key@example.com/mock", "ver1");
    expect(client.isSetup()).toBeTruthy();
    expect(client._globalOptions.release).toBe("ver1");
  });

  it("logs an error when invalid DSN is passed to raven", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const client = RavenClient("invalidDSN");
    expect(client.isSetup()).toBeFalsy();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ParseDefaultFilters()", () => {
  it("returns [] on missing filters attr", () => {
    const settings = document.createElement("span");
    settings.dataset = {};
    expect(ParseDefaultFilters(settings)).toHaveLength(0);
  });

  it("returns [] on empty filters attr", () => {
    const settings = document.createElement("span");
    settings.dataset = { defaultFiltersBase64: "" };
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
});
