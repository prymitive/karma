import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { CenteredMessage } from ".";

beforeEach(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<CenteredMessage />", () => {
  const Message = () => <div>Foo</div>;

  it("matches snapshot", () => {
    const tree = shallow(
      <CenteredMessage>
        <Message />
      </CenteredMessage>
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("uses 'display-1 text-placeholder' className by default", () => {
    const tree = shallow(
      <CenteredMessage>
        <Message />
      </CenteredMessage>
    );
    expect(toDiffableHtml(tree.html())).toMatch(/display-1 text-placeholder/);
  });

  it("uses custom className if passed", () => {
    const tree = shallow(
      <CenteredMessage className="bar-class">
        <Message />
      </CenteredMessage>
    );
    expect(toDiffableHtml(tree.html())).toMatch(/bar-class/);
    expect(toDiffableHtml(tree.html())).not.toMatch(
      /display-1 text-placeholder/
    );
  });
});
