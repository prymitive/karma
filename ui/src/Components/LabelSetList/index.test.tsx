import { render, screen, fireEvent } from "@testing-library/react";

import type { LabelsT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { LabelSetList } from ".";

let alertStore: AlertStore;

declare let global: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

afterEach(() => {
  global.window.innerWidth = 1024;
});

const renderLabelSetList = (labelsList: LabelsT[]) => {
  return render(
    <LabelSetList
      alertStore={alertStore}
      labelsList={labelsList}
      title="Affected alerts"
    />,
  );
};

describe("<LabelSetList />", () => {
  it("renders placeholder on empty list", () => {
    renderLabelSetList([]);
    expect(screen.getByText("No alerts matched")).toBeInTheDocument();
  });

  it("renders labels on populated list", () => {
    const { container } = renderLabelSetList([[{ name: "foo", value: "bar" }]]);
    expect(screen.queryByText("No alerts matched")).not.toBeInTheDocument();
    expect(container.querySelector("ul.list-group")?.textContent).toBe(
      "foo: bar",
    );
  });

  it("matches snapshot with populated list", () => {
    const { asFragment } = renderLabelSetList([
      [{ name: "foo", value: "bar" }],
      [{ name: "job", value: "node_exporter" }],
      [{ name: "instance", value: "server1" }],
      [{ name: "cluster", value: "prod" }],
    ]);
    expect(asFragment()).toMatchSnapshot();
  });

  it("doesn't render pagination when list has 10 elements on  desktop", () => {
    global.window.innerWidth = 1024;
    const { container } = renderLabelSetList(
      Array.from(Array(10), (_, i) => [
        { name: "instance", value: `server${i}` },
      ]),
    );
    expect(container.querySelectorAll(".pagination")).toHaveLength(0);
  });

  it("doesn't render pagination when list has 5 elements on  desktop", () => {
    global.window.innerWidth = 500;
    const { container } = renderLabelSetList(
      Array.from(Array(5), (_, i) => [
        { name: "instance", value: `server${i}` },
      ]),
    );
    expect(container.querySelectorAll(".pagination")).toHaveLength(0);
  });

  it("renders pagination when list has 11 elements on desktop", () => {
    global.window.innerWidth = 1024;
    const { container } = renderLabelSetList(
      Array.from(Array(11), (_, i) => [
        { name: "instance", value: `server${i}` },
      ]),
    );
    expect(container.querySelectorAll(".pagination")).toHaveLength(1);
  });

  it("renders pagination when list has 6 elements on mobile", () => {
    global.window.innerWidth = 500;
    const { container } = renderLabelSetList(
      Array.from(Array(6), (_, i) => [
        { name: "instance", value: `server${i}` },
      ]),
    );
    expect(container.querySelectorAll(".pagination")).toHaveLength(1);
  });

  it("clicking on pagination changes displayed elements", () => {
    const { container } = renderLabelSetList(
      Array.from(Array(21), (_, i) => [
        { name: "instance", value: `server${i + 1}` },
      ]),
    );
    const pageLinks = container.querySelectorAll(".page-link");
    fireEvent.click(pageLinks[3]);
    expect(container.querySelector("ul.list-group")?.textContent).toBe(
      "instance: server21",
    );
  });
});
