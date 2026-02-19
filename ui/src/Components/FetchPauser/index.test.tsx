import { act } from "react-dom/test-utils";

import { render } from "@testing-library/react";

import { AlertStore } from "Stores/AlertStore";
import { FetchPauser } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const renderFetchPauser = () => {
  return render(
    <FetchPauser alertStore={alertStore}>
      <div />
    </FetchPauser>,
  );
};

describe("<FetchPauser />", () => {
  it("mounting FetchPauser pauses alertStore", () => {
    renderFetchPauser();
    expect(alertStore.status.paused).toBe(true);
  });

  it("unmounting FetchPauser resumes alertStore", () => {
    const { unmount } = renderFetchPauser();
    act(() => {
      unmount();
    });
    expect(alertStore.status.paused).toBe(false);
  });
});
