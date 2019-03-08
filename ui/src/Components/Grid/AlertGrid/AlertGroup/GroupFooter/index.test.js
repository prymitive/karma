import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import {
  MockAlertGroup,
  MockAnnotation,
  MockAlert,
  MockSilence
} from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GroupFooter } from ".";

let group;
let alertStore;
let silenceFormStore;

const MockGroup = () => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert" },
    [
      MockAlert([], {}, "suppressed"),
      MockAlert([], {}, "suppressed"),
      MockAlert([], {}, "suppressed")
    ],
    [
      MockAnnotation("summary", "This is summary", true, false),
      MockAnnotation("hidden", "This is hidden annotation", false, false),
      MockAnnotation("link", "http://link.example.com", true, true)
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
  advanceTo(moment.utc([2000, 0, 1, 15, 0, 0]));
});

afterEach(() => {
  jest.restoreAllMocks();
  // reset Date() to current time
  clear();
});

const MountedGroupFooter = () => {
  return mount(
    <Provider alertStore={alertStore}>
      <GroupFooter
        group={group}
        alertmanagers={["default"]}
        afterUpdate={MockAfterUpdate}
        silenceFormStore={silenceFormStore}
      />
    </Provider>
  );
};

describe("<GroupFooter />", () => {
  it("matches snapshot", () => {
    const tree = MountedGroupFooter().find("GroupFooter");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("render deduplicated silence if present", () => {
    for (const id of Object.keys(group.alerts)) {
      group.alerts[id].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: "123456789" };
    const tree = MountedGroupFooter().find("GroupFooter");
    expect(tree.find("Silence")).toHaveLength(1);
  });

  it("mathes snapshot when silence is rendered", () => {
    for (const id of Object.keys(group.alerts)) {
      group.alerts[id].alertmanager[0].silencedBy = ["123456789"];
    }
    group.shared.silences = { default: "123456789" };

    alertStore.data.silences = {
      default: {
        "123456789": MockSilence()
      }
    };
    alertStore.data.silences["default"]["123456789"].id = "123456789";

    const tree = MountedGroupFooter().find("GroupFooter");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
