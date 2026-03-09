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
  enforceActions: "observed",
  // computedRequiresReaction: true,
  // reactionRequiresObservable: true,
  // observableRequiresReaction: true,
});

jest.mock("Hooks/useFetchGet");

jest.mock("react-intersection-observer");

FetchRetryConfig.minTimeout = 2;
FetchRetryConfig.maxTimeout = 10;

// floating-ui uses useLayoutEffect
React.useLayoutEffect = React.useEffect;

// Fail tests on any console output except explicitly allowed messages
const allowedMessages = [
  // React.lazy suspended resource warnings (React 19 testing limitation)
  "suspended resource finished loading",
  // AlertStore filter mismatch log
  "Got response with filters",
];

for (const level of ["error", "warn", "info"] as const) {
  const original = console[level];
  console[level] = (...args: unknown[]) => {
    const message = String(args[0]);
    if (allowedMessages.some((allowed) => message.includes(allowed))) {
      return;
    }
    original(...args);
    throw new Error(`console.${level} was called: ${args[0]}`);
  };
}

beforeEach(() => {
  localStorage.clear();
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
