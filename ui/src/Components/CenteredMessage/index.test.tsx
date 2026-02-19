import { render, screen } from "@testing-library/react";

import { MockThemeContext } from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { CenteredMessage } from ".";

const renderWithTheme = (ui: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={MockThemeContext}>
      {ui}
    </ThemeContext.Provider>,
  );

describe("<CenteredMessage />", () => {
  const Message = () => <div>Foo</div>;

  it("matches snapshot", () => {
    const { asFragment } = renderWithTheme(
      <CenteredMessage>
        <Message />
      </CenteredMessage>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("uses 'display-1 text-placeholder' className by default", () => {
    renderWithTheme(
      <CenteredMessage>
        <Message />
      </CenteredMessage>,
    );
    expect(screen.getByRole("heading")).toHaveClass(
      "display-1",
      "text-placeholder",
    );
  });

  it("uses custom className if passed", () => {
    renderWithTheme(
      <CenteredMessage className="bar-class">
        <Message />
      </CenteredMessage>,
    );
    const heading = screen.getByRole("heading");
    expect(heading).toHaveClass("bar-class");
    expect(heading).not.toHaveClass("display-1", "text-placeholder");
  });
});
