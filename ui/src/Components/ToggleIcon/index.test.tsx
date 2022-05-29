import { render } from "@testing-library/react";

import { ToggleIcon } from ".";

describe("<ToggleIcon />", () => {
  it("matches snapshot when open", () => {
    const { asFragment } = render(<ToggleIcon isOpen={true} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot when closed", () => {
    const { asFragment } = render(<ToggleIcon isOpen={false} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
