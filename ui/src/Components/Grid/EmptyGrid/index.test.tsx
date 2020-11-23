import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { EmptyGrid } from ".";

beforeEach(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<EmptyGrid />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<EmptyGrid />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
