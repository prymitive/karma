import { render } from "@testing-library/react";

import LightTheme from "./LightTheme";
import DarkTheme from "./DarkTheme";

describe("<LightTheme />", () => {
  it("renders null", () => {
    const { container } = render(<LightTheme />);
    expect(container.innerHTML).toBe("");
  });
});

describe("<DarkTheme />", () => {
  it("renders null", () => {
    const { container } = render(<DarkTheme />);
    expect(container.innerHTML).toBe("");
  });
});
