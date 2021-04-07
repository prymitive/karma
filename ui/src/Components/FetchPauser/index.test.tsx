import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { FetchPauser } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedFetchPauser = () => {
  return mount(
    <FetchPauser alertStore={alertStore}>
      <div />
    </FetchPauser>
  );
};

describe("<FetchPauser />", () => {
  it("mounting FetchPauser pauses alertStore", () => {
    MountedFetchPauser();
    expect(alertStore.status.paused).toBe(true);
  });

  it("unmounting FetchPauser resumes alertStore", () => {
    const tree = MountedFetchPauser();
    act(() => {
      tree.unmount();
    });
    expect(alertStore.status.paused).toBe(false);
  });
});
