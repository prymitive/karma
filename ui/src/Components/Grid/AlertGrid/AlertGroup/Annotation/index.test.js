import React from "react";

import { shallow, mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { RenderNonLinkAnnotation, RenderLinkAnnotation } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const ShallowLinkAnnotation = () => {
  return shallow(
    <RenderLinkAnnotation name="annotation name" value="http://localhost/foo" />
  );
};

describe("<RenderLinkAnnotation />", () => {
  it("matches snapshot", () => {
    const tree = ShallowLinkAnnotation();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("contains a link", () => {
    const tree = ShallowLinkAnnotation();
    const link = tree.find("a[href='http://localhost/foo']");
    expect(link).toHaveLength(1);
    expect(link.text()).toMatch(/annotation name/);
  });
});

const MockAfterUpdate = jest.fn();

const ShallowNonLinkAnnotation = visible => {
  return shallow(
    <RenderNonLinkAnnotation
      alertStore={alertStore}
      name="foo"
      value="some long text"
      visible={visible}
      afterUpdate={MockAfterUpdate}
    />
  );
};

const MountedNonLinkAnnotation = visible => {
  return mount(
    <RenderNonLinkAnnotation
      alertStore={alertStore}
      name="foo"
      value="some long text"
      visible={visible}
      afterUpdate={MockAfterUpdate}
    />
  );
};

const MountedNonLinkAnnotationContainingLink = visible => {
  return mount(
    <RenderNonLinkAnnotation
      alertStore={alertStore}
      name="foo"
      value="some long text with http://example.com link"
      visible={visible}
      afterUpdate={MockAfterUpdate}
    />
  );
};

describe("<RenderNonLinkAnnotation />", () => {
  it("matches snapshot when visible=true", () => {
    const tree = ShallowNonLinkAnnotation(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("contains value when visible=true", () => {
    const tree = ShallowNonLinkAnnotation(true);
    expect(tree.html()).toMatch(/some long text/);
  });

  it("matches snapshot when visible=false", () => {
    const tree = ShallowNonLinkAnnotation(false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't contain value when visible=false", () => {
    const tree = ShallowNonLinkAnnotation(false);
    expect(tree.html()).not.toMatch(/some long text/);
  });

  it("links inside annotation are rendered as a.href", () => {
    const tree = MountedNonLinkAnnotationContainingLink(true);
    const link = tree.find("a[href='http://example.com']");
    expect(link.text()).toBe("http://example.com");
  });

  it("clicking on - icon hides the value", () => {
    const tree = MountedNonLinkAnnotation(true);
    expect(tree.html()).toMatch(/fa-search-minus/);
    expect(tree.html()).toMatch(/some long text/);
    tree.find(".fa-search-minus").simulate("click");
    expect(tree.html()).toMatch(/fa-search-plus/);
    expect(tree.html()).not.toMatch(/some long text/);
  });

  it("clicking on + icon shows the value", () => {
    const tree = MountedNonLinkAnnotation(false);
    expect(tree.html()).toMatch(/fa-search-plus/);
    expect(tree.html()).not.toMatch(/some long text/);
    tree.find(".components-grid-annotation").simulate("click");
    expect(tree.html()).toMatch(/fa-search-minus/);
    expect(tree.html()).toMatch(/some long text/);
  });
});
