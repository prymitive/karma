import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { MockThemeContext } from "__mocks__/Theme";
import { PressKey } from "__mocks__/KeyPress";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { Browser } from ".";

let alertStore;
let silenceFormStore;
let settingsStore;
let cluster;
let silence;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  settingsStore = new Settings();
  cluster = "am";
  silence = MockSilence();

  settingsStore.fetchConfig.config.interval = 30;

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://example.com",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
  clear();

  localStorage.setItem("fetchConfig.interval", "");
});

const MockOnDeleteModalClose = jest.fn();

const MockSilenceList = (count) => {
  let silences = [];
  for (var index = 1; index <= count; index++) {
    const silence = MockSilence();
    silence.id = `silence${index}`;
    silences.push({
      cluster: cluster,
      alertCount: 123,
      silence: silence,
    });
  }
  return silences;
};

const MountedBrowser = () => {
  return mount(
    <Browser
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      onDeleteModalClose={MockOnDeleteModalClose}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<Browser />", () => {
  it("fetches /silences.json on mount", (done) => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
        },
      ])
    );
    MountedBrowser();
    setTimeout(() => {
      expect(fetch.mock.calls[0][0]).toBe(
        "./silences.json?sortReverse=0&showExpired=0&searchTerm="
      );
      done();
    }, 200);
  });

  it("fetches /silences.json in a loop", (done) => {
    settingsStore.fetchConfig.config.interval = 1;
    fetch.mockResponse(JSON.stringify([]));
    MountedBrowser();
    setTimeout(() => {
      expect(fetch.mock.calls).toHaveLength(4);
      done();
    }, 1100 * 3);
  });

  it("enabling reverse sort passes sortReverse=1 to the API", (done) => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
        },
      ])
    );
    const tree = MountedBrowser();

    const sortOrder = tree.find("button.btn-secondary").at(0);
    expect(sortOrder.text()).toBe("Sort order");
    sortOrder.simulate("click");

    setTimeout(() => {
      expect(fetch.mock.calls[1][0]).toBe(
        "./silences.json?sortReverse=1&showExpired=0&searchTerm="
      );
      done();
    }, 200);
  });

  it("enabling expired silences passes showExpired=1 to the API", (done) => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
        },
      ])
    );
    const tree = MountedBrowser();

    const expiredCheckbox = tree.find("input[type='checkbox']");
    expiredCheckbox.simulate("change", { target: { checked: true } });

    setTimeout(() => {
      expect(fetch.mock.calls[1][0]).toBe(
        "./silences.json?sortReverse=0&showExpired=1&searchTerm="
      );
      done();
    }, 200);
  });

  it("entering a search phrase passes searchTerm=foo to the API", (done) => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();

    const input = tree.find("input[type='text']").at(0);
    input.simulate("change", { target: { value: "foo" } });

    setTimeout(() => {
      expect(fetch.mock.calls[1][0]).toBe(
        "./silences.json?sortReverse=0&showExpired=0&searchTerm=foo"
      );
      done();
    }, 200);
  });

  it("renders loading placeholder before fetch finishes", (done) => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    expect(tree.find("Placeholder")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-spinner/);
    setTimeout(() => {
      done();
    }, 200);
  });

  it("renders empty placeholder after fetch with zero results", (done) => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    setTimeout(() => {
      expect(tree.find("Placeholder")).toHaveLength(1);
      expect(toDiffableHtml(tree.html())).toMatch(/Nothing to show/);
      done();
    }, 200);
  });

  it("renders silences after successful fetch", (done) => {
    fetch.mockResponse(
      JSON.stringify([
        {
          cluster: cluster,
          alertCount: 123,
          silence: silence,
        },
      ])
    );
    const tree = MountedBrowser();
    setTimeout(() => {
      tree.update();
      expect(tree.find("ManagedSilence")).toHaveLength(1);
      done();
    }, 200);
  });

  it("renders only first 5 silences", (done) => {
    fetch.mockResponse(JSON.stringify(MockSilenceList(6)));
    const tree = MountedBrowser();
    setTimeout(() => {
      tree.update();
      expect(tree.find("ManagedSilence")).toHaveLength(5);
      done();
    }, 200);
  });

  it("renders last silence after page change", (done) => {
    fetch.mockResponse(JSON.stringify(MockSilenceList(6)));
    const tree = MountedBrowser();

    setTimeout(() => {
      tree.update();
      expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);

      const pageLink = tree.find(".page-link").at(3);
      pageLink.simulate("click");
      tree.update();
      expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(1);
      done();
    }, 200);
  });

  it("renders next/previous page after arrow key press", (done) => {
    fetch.mockResponse(JSON.stringify(MockSilenceList(11)));
    const tree = MountedBrowser();

    setTimeout(() => {
      tree.update();
      expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);

      const paginator = tree.find(".components-pagination").at(0);
      paginator.simulate("focus");

      PressKey(paginator, "ArrowRight", 39);
      expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);

      PressKey(paginator, "ArrowRight", 39);
      expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(1);

      PressKey(paginator, "ArrowRight", 39);
      expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(1);

      PressKey(paginator, "ArrowLeft", 37);
      expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);

      PressKey(paginator, "ArrowLeft", 37);
      expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);

      PressKey(paginator, "ArrowLeft", 37);
      expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
      expect(tree.find("ManagedSilence")).toHaveLength(5);
      done();
    }, 200);
  });

  it("resets pagination to last page on truncation", (done) => {
    fetch.mockResponse(JSON.stringify(MockSilenceList(11)));
    const tree = MountedBrowser();
    setTimeout(() => {
      tree.update();
      expect(tree.find("li.page-item").at(1).hasClass("active")).toBe(true);
      const pageLink = tree.find(".page-link").at(3);
      pageLink.simulate("click");
      tree.update();
      expect(tree.find("ManagedSilence")).toHaveLength(1);
      expect(tree.find("li.page-item").at(3).hasClass("active")).toBe(true);

      fetch.mockResponse(JSON.stringify(MockSilenceList(7)));
      tree.find("button.btn-secondary").simulate("click");

      setTimeout(() => {
        tree.update();

        expect(tree.find("ManagedSilence")).toHaveLength(2);
        expect(tree.find("li.page-item").at(2).hasClass("active")).toBe(true);

        fetch.mockResponse(JSON.stringify([]));
        tree.find("button.btn-secondary").simulate("click");

        setTimeout(() => {
          tree.update();

          expect(tree.find("ManagedSilence")).toHaveLength(0);
          expect(tree.find("Placeholder")).toHaveLength(1);
          done();
        }, 200);
      }, 200);
    }, 200);
  });

  it("renders error after failed fetch", (done) => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.mockReject("fake failure");
    const tree = MountedBrowser();
    setTimeout(() => {
      tree.update();
      expect(tree.find("FetchError")).toHaveLength(1);
      expect(toDiffableHtml(tree.html())).toMatch(/exclamation-circle/);
      done();
    }, 200);
  });

  it("resets the timer on unmount", (done) => {
    fetch.mockResponse(JSON.stringify([]));
    const tree = MountedBrowser();
    setTimeout(() => {
      expect(fetch.mock.calls).toHaveLength(1);

      setTimeout(() => {
        tree.unmount();
        expect(fetch.mock.calls).toHaveLength(1);
        done();
      });
    }, 200);
  });
});
