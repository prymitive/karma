import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockSilence } from "__mocks__/Alerts";
import { SilenceComment } from "./SilenceComment";

let silence;

beforeEach(() => {
  silence = MockSilence();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
});

const MountedSilenceComment = collapsed => {
  return mount(<SilenceComment silence={silence} collapsed={collapsed} />);
};

describe("<SilenceComment />", () => {
  it("Matches snapshot when collapsed", () => {
    const tree = MountedSilenceComment(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Matches snapshot when expanded", () => {
    const tree = MountedSilenceComment(false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Renders a JIRA link if present", () => {
    silence.jiraURL = "http://localhost/1234";
    silence.jiraID = "1234";
    const tree = MountedSilenceComment(true);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(1);
  });

  it("Renders a JIRA link if present and comment is expanded", () => {
    silence.jiraURL = "http://localhost/1234";
    silence.jiraID = "1234";
    const tree = MountedSilenceComment(false);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(1);
  });
});
