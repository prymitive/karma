import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { ToggleIcon } from ".";

describe("<ToggleIcon />", () => {
  it("matches snapshot when open", () => {
    const tree = shallow(<ToggleIcon isOpen={true} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when closed", () => {
    const tree = shallow(<ToggleIcon isOpen={false} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
