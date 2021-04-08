import { shallow, mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { RenderNonLinkAnnotation, RenderLinkAnnotation } from ".";

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

const ShallowNonLinkAnnotation = (visible: boolean) => {
  return shallow(
    <RenderNonLinkAnnotation
      name="foo"
      value="some long text"
      visible={visible}
      allowHTML={false}
      afterUpdate={MockAfterUpdate}
    />
  );
};

const MountedNonLinkAnnotation = (visible: boolean) => {
  return mount(
    <RenderNonLinkAnnotation
      name="foo"
      value="some long text"
      visible={visible}
      allowHTML={false}
      afterUpdate={MockAfterUpdate}
    />
  );
};

const MountedNonLinkAnnotationContainingLink = (visible: boolean) => {
  return mount(
    <RenderNonLinkAnnotation
      name="foo"
      value="some long text with http://example.com link"
      visible={visible}
      allowHTML={false}
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
    expect(toDiffableHtml(tree.html())).toMatch(/some long text/);
  });

  it("matches snapshot when visible=false", () => {
    const tree = ShallowNonLinkAnnotation(false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't contain value when visible=false", () => {
    const tree = ShallowNonLinkAnnotation(false);
    expect(toDiffableHtml(tree.html())).not.toMatch(/some long text/);
  });

  it("links inside annotation are rendered as a.href", () => {
    const tree = MountedNonLinkAnnotationContainingLink(true);
    const link = tree.find("a[href='http://example.com']");
    expect(link.text()).toBe("http://example.com");
  });

  it("clicking on - icon hides the value", () => {
    const tree = MountedNonLinkAnnotation(true);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-search-minus/);
    expect(toDiffableHtml(tree.html())).toMatch(/some long text/);
    tree.find(".fa-search-minus").simulate("click");
    expect(toDiffableHtml(tree.html())).toMatch(/fa-search-plus/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/some long text/);
  });

  it("clicking on + icon shows the value", () => {
    const tree = MountedNonLinkAnnotation(false);
    expect(toDiffableHtml(tree.html())).toMatch(/fa-search-plus/);
    expect(toDiffableHtml(tree.html())).not.toMatch(/some long text/);
    tree.find(".components-grid-annotation").simulate("click");
    expect(toDiffableHtml(tree.html())).toMatch(/fa-search-minus/);
    expect(toDiffableHtml(tree.html())).toMatch(/some long text/);
  });

  it("escapes HTML when allowHTML=false", () => {
    const tree = shallow(
      <RenderNonLinkAnnotation
        name="foo"
        value="<div>inside div</div>"
        visible
        allowHTML={false}
        afterUpdate={MockAfterUpdate}
      />
    );
    expect(toDiffableHtml(tree.html())).toMatch(
      /&lt;div&gt;inside div&lt;\/div&gt;/
    );
  });

  it("doesn't escape HTML when allowHTML=true", () => {
    const tree = shallow(
      <RenderNonLinkAnnotation
        name="foo"
        value="<div>inside div</div>"
        visible
        allowHTML={true}
        afterUpdate={MockAfterUpdate}
      />
    );
    expect(tree.html()).toMatch(/<div>inside div<\/div>/);
  });
});
