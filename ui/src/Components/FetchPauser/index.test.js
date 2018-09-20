import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { FetchPauser } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedFetchPauser = () => {
  return mount(
    <Provider alertStore={alertStore}>
      <FetchPauser>
        <div />
      </FetchPauser>
    </Provider>
  );
};

describe("<FetchPauser />", () => {
  it("mounting FetchPauser pauses alertStore", () => {
    MountedFetchPauser();
    expect(alertStore.status.paused).toBe(true);
  });

  it("unmounting FetchPauser resumes alertStore", () => {
    const tree = MountedFetchPauser();
    tree.unmount();
    expect(alertStore.status.paused).toBe(false);
  });
});
