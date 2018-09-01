import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockAlertGroup, MockAnnotation } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { GroupFooter } from ".";

let group;
let alertStore;

const MockGroup = () => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert" },
    [],
    [
      MockAnnotation("summary", "This is summary", true, false),
      MockAnnotation("hidden", "This is hidden annotation", false, false),
      MockAnnotation("link", "http://link.example.com", true, true)
    ],
    { label1: "foo", label2: "bar" }
  );
  return group;
};

const MockAfterUpdate = jest.fn();

beforeEach(() => {
  alertStore = new AlertStore([]);
  group = MockGroup();
});

const MountedGroupFooter = () => {
  return mount(
    <Provider alertStore={alertStore}>
      <GroupFooter
        group={group}
        alertmanagers={["default"]}
        afterUpdate={MockAfterUpdate}
      />
    </Provider>
  );
};

describe("<GroupFooter />", () => {
  it("matches snapshot", () => {
    const tree = MountedGroupFooter().find("GroupFooter");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
