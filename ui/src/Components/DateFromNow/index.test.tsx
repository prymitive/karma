import { render, screen } from "@testing-library/react";

import { addSeconds } from "date-fns/addSeconds";
import { subSeconds } from "date-fns/subSeconds";

import { DateFromNow } from ".";

describe("<DateFromNow />", () => {
  it("renders 'just now' for now", () => {
    render(<DateFromNow timestamp={new Date().toISOString()} />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("renders 'a few seconds ago' for 35 seconds old timestamp", () => {
    render(
      <DateFromNow timestamp={subSeconds(new Date(), 35).toISOString()} />,
    );
    expect(screen.getByText("a few seconds ago")).toBeInTheDocument();
  });

  it("renders 'in a few seconds' for a timestamp 35 seconds away", () => {
    render(
      <DateFromNow timestamp={addSeconds(new Date(), 35).toISOString()} />,
    );
    expect(screen.getByText("in a few seconds")).toBeInTheDocument();
  });

  it("renders '1 minute ago' for 65 seconds old timestamp", () => {
    render(
      <DateFromNow timestamp={subSeconds(new Date(), 65).toISOString()} />,
    );
    expect(screen.getByText("1 minute ago")).toBeInTheDocument();
  });

  it("renders 'in 1 minute' for a timestamp 65 seconds away", () => {
    render(
      <DateFromNow timestamp={addSeconds(new Date(), 65).toISOString()} />,
    );
    expect(screen.getByText("in 1 minute")).toBeInTheDocument();
  });
});
