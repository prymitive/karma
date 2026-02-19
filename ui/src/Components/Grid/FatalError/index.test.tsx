import { render } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { FatalError } from ".";

describe("<FatalError />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <FatalError message="foo bar" />
      </ThemeContext.Provider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
