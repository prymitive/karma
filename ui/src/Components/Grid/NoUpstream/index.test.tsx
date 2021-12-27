import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { NoUpstream } from ".";

beforeEach(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<NoUpstream />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<NoUpstream />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
