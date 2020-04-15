import React from "react";

import { shallow } from "enzyme";

import { MockThemeContext } from "__mocks__/Theme";
import toDiffableHtml from "diffable-html";

import { EmptyGrid } from ".";

beforeAll(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<EmptyGrid />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<EmptyGrid />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
