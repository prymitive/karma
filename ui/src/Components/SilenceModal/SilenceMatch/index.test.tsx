import { render, fireEvent, act } from "@testing-library/react";
import { runInAction } from "mobx";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherWithIDT,
} from "Stores/SilenceFormStore";
import { StringToOption } from "Common/Select";
import SilenceMatch from ".";

let silenceFormStore: SilenceFormStore;
let matcher: MatcherWithIDT;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.setMatchers([NewEmptyMatcher()]);
  matcher = silenceFormStore.data.matchers[0];
});

const MockOnDelete = jest.fn();

const renderSilenceMatch = () => {
  return render(
    <SilenceMatch
      matcher={matcher}
      silenceFormStore={silenceFormStore}
      showDelete={false}
      onDelete={MockOnDelete}
      isValid={true}
    />,
  );
};

describe("<SilenceMatch />", () => {
  it("allows changing matcher.isRegex value when matcher.values contains 1 element", () => {
    runInAction(() => {
      matcher.values = [StringToOption("foo")];
    });
    const { container } = renderSilenceMatch();
    expect(matcher.isRegex).toBe(false);
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    fireEvent.click(checkboxes[1]);
    expect(matcher.isRegex).toBe(true);
  });

  it("disallows changing matcher.isRegex value when matcher.values contains 2 elements", () => {
    runInAction(() => {
      matcher.isRegex = true;
      matcher.values = [StringToOption("foo"), StringToOption("bar")];
    });
    const { container } = renderSilenceMatch();
    expect(matcher.isRegex).toBe(true);
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    fireEvent.click(checkboxes[1]);
    expect(matcher.isRegex).toBe(true);
  });

  it("updates isEqual on click", () => {
    runInAction(() => {
      matcher.values = [StringToOption("foo")];
    });
    const { container } = renderSilenceMatch();
    expect(matcher.isEqual).toBe(true);
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    fireEvent.click(checkboxes[0]);
    expect(matcher.isEqual).toBe(false);
  });

  it("re-renders isEqual and isRegex checkboxes when matcher state changes after mount", () => {
    runInAction(() => {
      matcher.values = [StringToOption("foo")];
    });
    const { container } = renderSilenceMatch();
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    act(() => {
      runInAction(() => {
        matcher.isEqual = false;
        matcher.isRegex = true;
      });
    });
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
  });

  it("refetches label value suggestions when matcher name changes", () => {
    renderSilenceMatch();
    act(() => {
      runInAction(() => {
        matcher.name = "cluster";
      });
    });
    expect(useFetchGetMock.fetch.calls).toContain(
      "./labelValues.json?name=cluster",
    );
  });
});
