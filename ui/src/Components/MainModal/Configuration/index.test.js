import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { Configuration } from ".";

describe("<Configuration />", () => {
  it("matches snapshot", () => {
    const settingsStore = new Settings();
    const tree = shallow(
      <Configuration settingsStore={settingsStore} defaultIsOpen={true} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
