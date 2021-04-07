import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Help } from "./Help";

describe("<Help />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<Help defaultIsOpen={true} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
