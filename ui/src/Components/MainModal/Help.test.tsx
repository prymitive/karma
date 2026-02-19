import { render } from "@testing-library/react";

import { Help } from "./Help";

describe("<Help />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(<Help defaultIsOpen={true} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
