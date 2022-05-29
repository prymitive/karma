import { render } from "@testing-library/react";

import { ValidationError } from ".";

describe("<ValidationError />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(<ValidationError />);
    expect(asFragment()).toMatchSnapshot();
  });
});
