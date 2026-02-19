import { render } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { EmptyGrid } from ".";

describe("<EmptyGrid />", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <EmptyGrid />
      </ThemeContext.Provider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
