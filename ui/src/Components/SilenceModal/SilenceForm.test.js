import React from "react";

import { mount, shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceForm } from "./SilenceForm";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
});

const ShallowSilenceForm = () => {
  return shallow(
    <SilenceForm alertStore={alertStore} silenceFormStore={silenceFormStore} />
  );
};

const MountedSilenceForm = () => {
  return mount(
    <SilenceForm alertStore={alertStore} silenceFormStore={silenceFormStore} />
  );
};

describe("<SilenceForm /> matchers", () => {
  it("has an empty matcher selects on default render", () => {
    const tree = ShallowSilenceForm();
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(1);
    expect(silenceFormStore.data.matchers).toHaveLength(1);
  });

  it("clicking 'Add more' button adds another matcher", () => {
    const tree = ShallowSilenceForm();
    const button = tree.find("button[type='button']");
    button.simulate("click", { preventDefault: jest.fn() });
    const matchers = tree.find("SilenceMatch");
    expect(matchers).toHaveLength(2);
    expect(silenceFormStore.data.matchers).toHaveLength(2);
  });

  it("clicking trash icon on a matcher select removes it", () => {
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.addEmptyMatcher();
    const tree = MountedSilenceForm();
    expect(silenceFormStore.data.matchers).toHaveLength(3);

    const matchers = tree.find("SilenceMatch");
    const toDelete = matchers.at(1);
    const button = toDelete.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.matchers).toHaveLength(2);
  });
});

describe("<SilenceForm /> preview", () => {
  it("doesn't render SilencePreview when previewCollapse.hidden is true", () => {
    const tree = ShallowSilenceForm();
    const instance = tree.instance();
    instance.previewCollapse.hidden = true;
    expect(tree.find("SilencePreview")).toHaveLength(0);
  });

  it("renders SilencePreview when previewCollapse.hidden is false", () => {
    const tree = ShallowSilenceForm();
    const instance = tree.instance();
    instance.previewCollapse.hidden = false;
    expect(tree.find("SilencePreview")).toHaveLength(1);
  });

  it("clicking on the toggle icon toggles SilencePreview", () => {
    const tree = ShallowSilenceForm();
    const button = tree.find("a.btn.cursor-pointer.text-muted");
    expect(tree.find("SilencePreview")).toHaveLength(0);
    button.simulate("click");
    expect(tree.find("SilencePreview")).toHaveLength(1);
    button.simulate("click");
    expect(tree.find("SilencePreview")).toHaveLength(0);
  });
});

describe("<SilenceForm /> inputs", () => {
  it("changing author input updates SilenceFormStore", () => {
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Author email']");
    input.simulate("change", { target: { value: "me@example.com" } });
    expect(silenceFormStore.data.author).toBe("me@example.com");
  });

  it("changing comment input updates SilenceFormStore", () => {
    const tree = MountedSilenceForm();
    const input = tree.find("input[placeholder='Comment']");
    input.simulate("change", { target: { value: "fake comment" } });
    expect(silenceFormStore.data.comment).toBe("fake comment");
  });
});

describe("<SilenceForm />", () => {
  it("calling submit marks form as in progress", () => {
    const tree = ShallowSilenceForm();
    tree.simulate("submit", { preventDefault: jest.fn() });
    expect(silenceFormStore.data.inProgress).toBe(true);
  });
});
