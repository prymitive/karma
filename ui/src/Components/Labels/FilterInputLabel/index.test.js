import React from "react";

import { shallow, mount } from "enzyme";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { FilterInputLabel } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const NonEqualMatchers = ["!=", "=~", "!~", ">", "<"];

const MockColors = () => {
  alertStore.data.colors["foo"] = {
    bar: {
      brightness: 200,
      background: { red: 4, green: 5, blue: 6, alpha: 200 }
    }
  };
};

const ShallowLabel = (matcher, applied, valid) => {
  const name = "foo";
  const value = "bar";
  const filter = NewUnappliedFilter(`${name}${matcher}${value}`);
  filter.applied = applied;
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  filter.isValid = valid;
  return shallow(<FilterInputLabel alertStore={alertStore} filter={filter} />);
};

const ValidateClass = (matcher, applied, expectedClass) => {
  const tree = ShallowLabel(matcher, applied, true);
  expect(tree.props().className.split(" ")).toContain(expectedClass);
};

const ValidateOnChange = newRaw => {
  const tree = shallow(
    <FilterInputLabel
      alertStore={alertStore}
      filter={alertStore.filters.values[0]}
    />
  );
  tree.instance().onChange({ raw: newRaw });

  return tree;
};

describe("<FilterInputLabel /> className", () => {
  it("unapplied filter with '=' matcher should use 'badge-secondary' class", () => {
    ValidateClass("=", false, "badge-secondary");
  });

  it("unapplied filter with any matcher other than '=' should use 'badge-secondary' class", () => {
    for (const matcher of NonEqualMatchers) {
      ValidateClass(matcher, false, "badge-secondary");
    }
  });

  it("applied filter with '=' matcher and no color should use 'badge-warning' class", () => {
    ValidateClass("=", true, "badge-warning");
  });

  it("applied filter with any matcher other than '=' and no color should use 'badge-warning' class", () => {
    for (const matcher of NonEqualMatchers) {
      ValidateClass(matcher, true, "badge-warning");
    }
  });

  it("applied filter included in staticColorLabels with '=' matcher should use 'badge-info' class", () => {
    alertStore.settings.values.staticColorLabels = ["foo"];
    ValidateClass("=", true, "badge-info");
  });

  it("applied filter included in staticColorLabels with any matcher other than '=' should use 'badge-warning' class", () => {
    alertStore.settings.values.staticColorLabels = ["foo"];
    for (const matcher of NonEqualMatchers) {
      ValidateClass(matcher, true, "badge-warning");
    }
  });
});

describe("<FilterInputLabel /> style", () => {
  it("unapplied filter with color information and '=' matcher should have empty style", () => {
    MockColors();
    const tree = ShallowLabel("=", false, true);
    expect(tree.props().style).toMatchObject({});
  });

  it("unapplied filter with no color information and '=' matcher should have empty style", () => {
    const tree = ShallowLabel("=", false, true);
    expect(tree.props().style).toMatchObject({});
  });

  it("unapplied filter with no color information and any matcher other than '=' should have empty style", () => {
    for (const matcher of NonEqualMatchers) {
      const tree = ShallowLabel(matcher, false, true);
      expect(tree.props().style).toMatchObject({});
    }
  });

  it("applied filter with color information and '=' matcher should have non empty style", () => {
    MockColors();
    const tree = ShallowLabel("=", true, true);
    expect(tree.props().style).toMatchObject({
      color: "rgba(44, 62, 80, 255)",
      backgroundColor: "rgba(4, 5, 6, 200)"
    });
  });

  it("applied filter with no color information and '=' matcher should have empty style", () => {
    const tree = ShallowLabel("=", true, true);
    expect(tree.props().style).toMatchObject({});
  });

  it("applied filter with no color information and any matcher other than '=' should have empty style", () => {
    for (const matcher of NonEqualMatchers) {
      const tree = ShallowLabel(matcher, true, true);
      expect(tree.props().style).toMatchObject({});
    }
  });
});

describe("<FilterInputLabel /> onChange", () => {
  it("filter raw value is updated after onChange call", () => {
    alertStore.filters.values = [NewUnappliedFilter("foo=bar")];
    ValidateOnChange("baz=abc");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("baz=abc")
    );
  });

  it("filter is removed after onChange call with empty value", () => {
    alertStore.filters.values = [NewUnappliedFilter("foo=bar")];
    ValidateOnChange("");
    expect(alertStore.filters.values).toHaveLength(0);
  });

  it("onChange doesn't allow duplicates", () => {
    alertStore.filters.values = [
      NewUnappliedFilter("foo=bar"),
      NewUnappliedFilter("bar=baz")
    ];
    ValidateOnChange("bar=baz");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).not.toContainEqual(
      NewUnappliedFilter("foo=bar")
    );
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("bar=baz")
    );
  });
});

describe("<FilterInputLabel /> onChange", () => {
  it("clicking on the X button removes filters from alertStore", () => {
    alertStore.filters.values = [
      NewUnappliedFilter("foo=bar"),
      NewUnappliedFilter("bar=baz")
    ];
    const tree = mount(
      <FilterInputLabel
        alertStore={alertStore}
        filter={alertStore.filters.values[0]}
      />
    );
    const button = tree.find("button");
    button.simulate("click");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("bar=baz")
    );
  });
});

describe("<FilterInputLabel /> render", () => {
  it("invalid filter matches snapshot", () => {
    const tree = ShallowLabel("=", true, false);
    const errorSpan = tree.find(".text-danger");
    expect(errorSpan).toHaveLength(1);
    const errorIcon = errorSpan.find("FontAwesomeIcon");
    expect(errorIcon).toHaveLength(1);
  });
});
