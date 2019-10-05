import * as Sentry from "@sentry/browser";

import { DefaultsBase64, DefaultsObject } from "__mocks__/Defaults";
import {
  SettingsElement,
  SetupSentry,
  ParseDefaultFilters,
  ParseUIDefaults
} from "./AppBoot";

beforeAll(() => {
  // https://github.com/jamesmfriedman/rmwc/issues/103#issuecomment-360007979
  Object.defineProperty(window.HTMLElement.prototype, "dataset", {
    writable: true,
    value: {}
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  // reset sentry state before each mock, that's the only way to revert
  // Sentry.init() that I found
  global.__SENTRY__ = {};
});

const FakeDSN = "https://81a9ef37a6ed4fdb80e9ea2310d1ed28@127.0.0.1/1234123";

const MockSettings = (version, SentryDsn, defaultFilters) => {
  return jest.spyOn(document, "getElementById").mockImplementation(() => {
    const filtersBase64 = btoa(JSON.stringify(defaultFilters));
    const settings = document.createElement("span");
    settings.id = "settings";
    settings.dataset = {
      version: version,
      SentryDsn: SentryDsn,
      defaultFiltersBase64: filtersBase64
    };
    return settings;
  });
};

const SentryClient = (SentryDsn, version) => {
  const settings = document.createElement("span");
  settings.dataset = { sentryDsn: SentryDsn, version: version };
  SetupSentry(settings);
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
    expect(settings.dataset.SentryDsn).toBe("fakeDSN");
  });
});

describe("SetupSentry()", () => {
  it("does nothing when Sentry DSN is missing", () => {
    const sentrySpy = jest.spyOn(Sentry, "init");
    SentryClient("");
    expect(sentrySpy).not.toHaveBeenCalled();
  });

  it("configures Sentry when DSN is present", () => {
    const sentrySpy = jest.spyOn(Sentry, "init");
    SentryClient(FakeDSN);
    expect(sentrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: FakeDSN,
        release: "unknown" // default version
      })
    );
  });

  it("passes release option when version attr is present", () => {
    const sentrySpy = jest.spyOn(Sentry, "init");
    SentryClient(FakeDSN, "ver1");
    expect(sentrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: FakeDSN,
        release: "ver1"
      })
    );
  });

  it("logs an error when invalid DSN is passed to Sentry", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    SentryClient("invalidDSN");
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

describe("ParseUIDefaults()", () => {
  it("parses base64 encoded JSON with defaults", () => {
    const uiDefaults = ParseUIDefaults(DefaultsBase64);
    expect(uiDefaults).toStrictEqual(DefaultsObject);
  });

  it("returns undefined on invalid JSON", () => {
    const uiDefaults = ParseUIDefaults("e3h4eC9mZgo=");
    expect(uiDefaults).toBeUndefined();
  });
});
