import React from "react";

import "@testing-library/jest-dom";

import { useInView } from "react-intersection-observer";

import { createMocks as createIdleTimerMocks } from "react-idle-timer";

import { configure } from "mobx";

import { FetchRetryConfig } from "Common/Fetch";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { useFetchGet } from "Hooks/useFetchGet";

createIdleTimerMocks();

configure({
  enforceActions: "always",
  //computedRequiresReaction: true,
  //reactionRequiresObservable: true,
  //observableRequiresReaction: true,
});

jest.mock("Hooks/useFetchGet");

jest.mock("react-intersection-observer");

FetchRetryConfig.minTimeout = 2;
FetchRetryConfig.maxTimeout = 10;

// floating-ui uses useLayoutEffect
React.useLayoutEffect = React.useEffect;

beforeEach(() => {
  useFetchGetMock.fetch.reset();
  (useFetchGet as jest.MockedFunction<typeof useFetchGetMock>).mockRestore();
  (
    useFetchGet as jest.MockedFunction<typeof useFetchGetMock>
  ).mockImplementation(useFetchGetMock);

  (useInView as jest.MockedFunction<typeof useInView>).mockReturnValue([
    jest.fn(),
    true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
});
