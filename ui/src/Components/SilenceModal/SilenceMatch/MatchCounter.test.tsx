import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { EmptyAPIResponse } from "__fixtures__/Fetch";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherWithIDT,
} from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { StringToOption } from "Common/Select";
import { MatchCounter } from "./MatchCounter";

let matcher: MatcherWithIDT;
let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  matcher = NewEmptyMatcher();
  matcher.name = "foo";
  matcher.values = [StringToOption("bar")];
});

afterEach(() => {
  jest.restoreAllMocks();
});

const MountedMatchCounter = () => {
  return mount(
    <MatchCounter silenceFormStore={silenceFormStore} matcher={matcher} />
  );
};

describe("<MatchCounter />", () => {
  it("matches snapshot", () => {
    const tree = MountedMatchCounter();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders spinner icon while fetching", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-spinner")).toHaveLength(1);
    expect(tree.find("svg.fa-spinner.text-danger")).toHaveLength(0);
  });

  it("renders spinner icon with text-danger while retrying fetching", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: true,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-spinner.text-danger")).toHaveLength(1);
  });

  it("renders error icon on failed fetch", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "failed",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const tree = MountedMatchCounter();
    expect(tree.find("svg.fa-exclamation-circle.text-danger")).toHaveLength(1);
  });

  it("totalAlerts is 0 after mount", () => {
    const r = EmptyAPIResponse();
    r.totalAlerts = 0;
    useFetchGetMock.fetch.setMockedData({
      response: r,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("0");
  });

  it("updates totalAlerts after successful fetch", () => {
    const tree = MountedMatchCounter();
    expect(tree.text()).toBe("25");
  });

  it("sends correct query string for a 'foo=bar' matcher", () => {
    MountedMatchCounter();
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGet>).mock.calls[0][0]
    ).toBe("./alerts.json?q=foo%3Dbar");
  });

  it("sends correct query string for a 'foo=~bar' matcher", () => {
    matcher.isRegex = true;
    MountedMatchCounter();
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGet>).mock.calls[0][0]
    ).toBe("./alerts.json?q=foo%3D~%5Ebar%24");
  });

  it("sends correct query string for a 'foo=~(bar|baz)' matcher", () => {
    matcher.values = [StringToOption("bar"), StringToOption("baz")];
    matcher.isRegex = true;
    silenceFormStore.data.setAlertmanagers([]);
    MountedMatchCounter();
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGet>).mock.calls[0][0]
    ).toBe("./alerts.json?q=foo%3D~%5E%28bar%7Cbaz%29%24");
  });

  it("selecting one Alertmanager instance appends it to the filters", () => {
    silenceFormStore.data.setAlertmanagers([
      {
        label: "am1",
        value: ["am1"],
      },
    ]);
    MountedMatchCounter();
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGet>).mock.calls[0][0]
    ).toBe("./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%29%24");
  });

  it("selecting two Alertmanager instances appends it correctly to the filters", () => {
    silenceFormStore.data.setAlertmanagers([
      {
        label: "am1",
        value: ["am1"],
      },
      {
        label: "am2",
        value: ["am2"],
      },
    ]);
    MountedMatchCounter();
    expect(
      (useFetchGet as jest.MockedFunction<typeof useFetchGet>).mock.calls[0][0]
    ).toBe(
      "./alerts.json?q=foo%3Dbar&q=%40alertmanager%3D~%5E%28am1%7Cam2%29%24"
    );
  });
});
