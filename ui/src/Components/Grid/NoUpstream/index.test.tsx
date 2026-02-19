import { render } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { NoUpstream } from ".";

describe("<NoUpstream />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <NoUpstream />
      </ThemeContext.Provider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
