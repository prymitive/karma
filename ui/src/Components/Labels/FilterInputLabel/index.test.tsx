import { render, fireEvent } from "@testing-library/react";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilterInputLabel } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const NonEqualMatchers = ["!=", "=~", "!~", ">", "<"];

const MockColors = () => {
  alertStore.data.setColors({
    foo: {
      bar: {
        brightness: 200,
        background: "rgba(4,5,6,200)",
      },
    },
    ...alertStore.data.colors,
  });
};

const createFilter = (
  matcher: string,
  applied: boolean,
  valid: boolean,
  hits: number,
) => {
  const name = "foo";
  const value = "bar";
  const filter = NewUnappliedFilter(`${name}${matcher}${value}`);
  filter.applied = applied;
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  filter.isValid = valid;
  filter.hits = hits;
  return filter;
};

const renderLabel = (
  matcher: string,
  applied: boolean,
  valid: boolean,
  hits: number,
) => {
  const filter = createFilter(matcher, applied, valid, hits);
  return render(<FilterInputLabel alertStore={alertStore} filter={filter} />);
};

const validateClass = (
  matcher: string,
  applied: boolean,
  expectedClass: string,
) => {
  const { container } = renderLabel(matcher, applied, true, 1);
  const label = container.firstChild as HTMLElement;
  expect(label.className.split(" ")).toContain(expectedClass);
};

describe("<FilterInputLabel /> className", () => {
  it("unapplied filter with '=' matcher should use 'btn-secondary' class", () => {
    validateClass("=", false, "btn-secondary");
  });

  it("unapplied filter with any matcher other than '=' should use 'btn-secondary' class", () => {
    for (const matcher of NonEqualMatchers) {
      validateClass(matcher, false, "btn-secondary");
    }
  });

  it("applied filter with '=' matcher and no color should use 'btn-default' class", () => {
    validateClass("=", true, "btn-default");
  });

  it("applied filter with any matcher other than '=' and no color should use 'btn-default' class", () => {
    for (const matcher of NonEqualMatchers) {
      validateClass(matcher, true, "btn-default");
    }
  });

  it("applied filter included in staticColorLabels with '=' matcher should use 'btn-info' class", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{
        labels: {
          foo: { isStatic: true, isValueOnly: false },
        },
      },
    });
    validateClass("=", true, "btn-info");
  });

  it("applied filter included in staticColorLabels with any matcher other than '=' should use 'btn-default' class", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{
        labels: {
          foo: { isStatic: true, isValueOnly: false },
        },
      },
    });
    for (const matcher of NonEqualMatchers) {
      validateClass(matcher, true, "btn-default");
    }
  });
});

describe("<FilterInputLabel /> style", () => {
  it("unapplied filter with color information and '=' matcher should have empty style", () => {
    MockColors();
    const { container } = renderLabel("=", false, true, 1);
    const label = container.firstChild as HTMLElement;
    expect(label.style.backgroundColor).toBe("");
  });

  it("unapplied filter with no color information and '=' matcher should have empty style", () => {
    const { container } = renderLabel("=", false, true, 1);
    const label = container.firstChild as HTMLElement;
    expect(label.style.backgroundColor).toBe("");
  });

  it("unapplied filter with no color information and any matcher other than '=' should have empty style", () => {
    for (const matcher of NonEqualMatchers) {
      const { container } = renderLabel(matcher, false, true, 1);
      const label = container.firstChild as HTMLElement;
      expect(label.style.backgroundColor).toBe("");
    }
  });

  it("applied filter with color information and '=' matcher should have non empty style", () => {
    MockColors();
    const { container } = renderLabel("=", true, true, 1);
    const label = container.firstChild as HTMLElement;
    expect(label.style.backgroundColor).toBe("rgb(4, 5, 6)");
  });

  it("applied filter with no color information and '=' matcher should have empty style", () => {
    const { container } = renderLabel("=", true, true, 1);
    const label = container.firstChild as HTMLElement;
    expect(label.style.backgroundColor).toBe("");
  });

  it("applied filter with no color information and any matcher other than '=' should have empty style", () => {
    for (const matcher of NonEqualMatchers) {
      const { container } = renderLabel(matcher, true, true, 1);
      const label = container.firstChild as HTMLElement;
      expect(label.style.backgroundColor).toBe("");
    }
  });
});

describe("<FilterInputLabel /> onChange", () => {
  it("clicking on the X button removes filters from alertStore", () => {
    alertStore.filters.setFilterValues([
      NewUnappliedFilter("foo=bar"),
      NewUnappliedFilter("bar=baz"),
    ]);
    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />,
    );

    const button = container.querySelector("svg.fa-xmark");
    fireEvent.click(button!);
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("bar=baz"),
    );
  });

  it("editing filter to new value replaces it in alertStore", () => {
    // Verifies that onChange replaces filter when edited to new value
    const filter = createFilter("=", true, true, 1);
    alertStore.filters.setFilterValues([filter]);

    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />,
    );

    const editSpan = container.querySelector(
      ".components-filteredinputlabel-text span",
    );
    fireEvent.click(editSpan!);

    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "foo=newvalue" } });
    fireEvent.keyDown(input!, { keyCode: 13 });

    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0].raw).toBe("foo=newvalue");
  });

  it("editing filter to empty value removes it from alertStore", () => {
    // Verifies that onChange removes filter when edited to empty string (line 24)
    const filter1 = createFilter("=", true, true, 1);
    const filter2 = NewUnappliedFilter("baz=qux");
    alertStore.filters.setFilterValues([filter1, filter2]);

    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />,
    );

    const editSpan = container.querySelector(
      ".components-filteredinputlabel-text span",
    );
    fireEvent.click(editSpan!);

    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "" } });
    fireEvent.keyDown(input!, { keyCode: 13 });

    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0].raw).toBe("baz=qux");
  });
});

describe("<FilterInputLabel /> render", () => {
  it("invalid filter shows error icon", () => {
    const { container } = renderLabel("=", true, false, 1);
    const errorIcon = container.querySelector("svg.text-danger");
    expect(errorIcon).toBeInTheDocument();
  });
});

const PopulateFiltersFromHits = (totalAlerts: number, hitsList: number[]) => {
  alertStore.info.setTotalAlerts(totalAlerts);
  hitsList.forEach((hits, index) => {
    const filter = NewUnappliedFilter(`foo=${index}`);
    filter.hits = hits;
    filter.applied = true;
    alertStore.filters.setFilterValues([...alertStore.filters.values, filter]);
  });
};

describe("<FilterInputLabel /> counter badge", () => {
  it("counter is not rendered when hits === totalAlerts", () => {
    PopulateFiltersFromHits(10, [10, 10]);
    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />,
    );
    const counter = container.querySelector(".rounded-pill");
    expect(counter).not.toBeInTheDocument();
  });

  it("counter is rendered when hits !== totalAlerts #1", () => {
    PopulateFiltersFromHits(10, [10, 5]);
    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />,
    );
    const counter = container.querySelector(".rounded-pill");
    expect(counter).toBeInTheDocument();
  });

  it("counter is rendered when hits !== totalAlerts #2", () => {
    PopulateFiltersFromHits(10, [4, 5]);
    const { container } = render(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[1]}
      />,
    );
    const counter = container.querySelector(".rounded-pill");
    expect(counter).toBeInTheDocument();
  });
});
