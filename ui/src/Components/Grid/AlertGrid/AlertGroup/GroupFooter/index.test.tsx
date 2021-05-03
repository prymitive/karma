import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { advanceTo, clear } from "jest-date-mock";

import {
  MockAlertGroup,
  MockAnnotation,
  MockAlert,
  MockSilence,
} from "__fixtures__/Alerts";
import { MockThemeContext } from "__fixtures__/Theme";
import { APIAlertGroupT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import GroupFooter from ".";

let group: APIAlertGroupT;
let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

const MockGroup = () => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert" },
    [
      MockAlert([], {}, "suppressed"),
      MockAlert([], {}, "suppressed"),
      MockAlert([], {}, "suppressed"),
    ],
    [
      MockAnnotation("summary", "This is summary", true, false, false),
      MockAnnotation(
        "hidden",
        "This is hidden annotation",
        false,
        false,
        false
      ),
      MockAnnotation("link", "http://link.example.com", true, true, false),
    ],
    { label1: "foo", label2: "bar" },
    {}
  );
  return group;
};

const MockAfterUpdate = jest.fn();

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  group = MockGroup();
  advanceTo(new Date(Date.UTC(2000, 0, 1, 15, 0, 0)));

  alertStore.data.setReceivers(["by-cluster-service", "by-name"]);
});

afterEach(() => {
  jest.restoreAllMocks();
  // reset Date() to current time
  clear();
});

const MountedGroupFooter = () => {
  return mount(
    <GroupFooter
      group={group}
      alertmanagers={["default"]}
      afterUpdate={MockAfterUpdate}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<GroupFooter />", () => {
  it("matches snapshot", () => {
    const tree = MountedGroupFooter().find("GroupFooter");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("render deduplicated silence if present", () => {
    for (let index = 0; index < group.alerts.length; index++) {
      group.alerts[index].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: ["123456789"] };
    alertStore.data.setSilences({
      default: {
        "123456789": MockSilence(),
      },
    });

    const tree = MountedGroupFooter().find("GroupFooter");
    expect(tree.find("ManagedSilence")).toHaveLength(1);
  });

  it("render fallback silence if not found in alertStore", () => {
    for (let index = 0; index < group.alerts.length; index++) {
      group.alerts[index].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: ["123456789"] };
    alertStore.data.setSilences({
      default: {},
    });

    const tree = MountedGroupFooter().find("GroupFooter");
    expect(tree.find("FallbackSilenceDesciption")).toHaveLength(1);
  });

  it("render fallback silence if cluster not found in alertStore", () => {
    for (let index = 0; index < group.alerts.length; index++) {
      group.alerts[index].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: ["123456789"] };
    alertStore.data.setSilences({
      foo: {},
    });

    const tree = MountedGroupFooter().find("GroupFooter");
    expect(tree.find("FallbackSilenceDesciption")).toHaveLength(1);
  });

  it("mathes snapshot when silence is rendered", () => {
    for (let index = 0; index < group.alerts.length; index++) {
      group.alerts[index].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: ["123456789"] };

    const silence = MockSilence();
    silence.id = "123456789";
    alertStore.data.setSilences({
      default: {
        "123456789": silence,
      },
    });

    const tree = MountedGroupFooter().find("GroupFooter");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders @receiver label when alertStore.data.receivers.length > 1", () => {
    alertStore.data.setReceivers(["foo", "bar"]);
    const tree = MountedGroupFooter();
    expect(toDiffableHtml(tree.html())).toMatch(/@receiver:/);
  });

  it("doesn't render @receiver label when alertStore.data.receivers.length == 0", () => {
    alertStore.data.setReceivers([]);
    const tree = MountedGroupFooter();
    expect(toDiffableHtml(tree.html())).not.toMatch(/@receiver:/);
  });

  it("doesn't render silences when showSilences=false", () => {
    for (let index = 0; index < group.alerts.length; index++) {
      group.alerts[index].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: ["123456789"] };

    const silence = MockSilence();
    silence.id = "123456789";
    alertStore.data.setSilences({
      default: {
        "123456789": silence,
      },
    });

    const tree = mount(
      <GroupFooter
        group={group}
        alertmanagers={["default"]}
        afterUpdate={MockAfterUpdate}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        showSilences={false}
      />,
      {
        wrappingComponent: ThemeContext.Provider,
        wrappingComponentProps: { value: MockThemeContext },
      }
    );
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup-shared-silence")
    ).toHaveLength(0);
  });

  it("doesn't render annotations when showAnnotations=false", () => {
    const tree = mount(
      <GroupFooter
        group={group}
        alertmanagers={["default"]}
        afterUpdate={MockAfterUpdate}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        showAnnotations={false}
      />,
      {
        wrappingComponent: ThemeContext.Provider,
        wrappingComponentProps: { value: MockThemeContext },
      }
    );
    expect(tree.find("RenderLinkAnnotation")).toHaveLength(0);
    expect(tree.find("RenderNonLinkAnnotation")).toHaveLength(0);
  });
});
