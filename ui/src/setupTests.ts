import React from "react";

import "@testing-library/jest-dom";

import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/jest";

import { useInView } from "react-intersection-observer";

import { createMocks as createIdleTimerMocks } from "react-idle-timer";

import { configure } from "mobx";

import { FetchRetryConfig } from "Common/Fetch";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { useFetchGet } from "Hooks/useFetchGet";

createIdleTimerMocks();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
manageFetchMockGlobally(jest as any);
fetchMock.mockGlobal();

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

// Fail tests on console.error to catch React warnings
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0]);
  // Allow React.lazy suspended resource warnings (React 19 testing limitation)
  if (message.includes("suspended resource finished loading")) {
    return;
  }
  originalConsoleError(...args);
  throw new Error(`console.error was called: ${args[0]}`);
};

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
