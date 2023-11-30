import React from "react";

import Enzyme from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";

import "@testing-library/jest-dom";

import { useInView } from "react-intersection-observer";

// react-idle-timer >= 4.6.0
import "regenerator-runtime/runtime";

import { configure } from "mobx";

import { FetchRetryConfig } from "Common/Fetch";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { useFetchGet } from "Hooks/useFetchGet";

configure({
  enforceActions: "always",
  //computedRequiresReaction: true,
  //reactionRequiresObservable: true,
  //observableRequiresReaction: true,
});

jest.mock("Hooks/useFetchGet");

jest.mock("react-intersection-observer");

// https://github.com/airbnb/enzyme
Enzyme.configure({ adapter: new Adapter() });

FetchRetryConfig.minTimeout = 2;
FetchRetryConfig.maxTimeout = 10;

// floating-ui uses useLayoutEffect but that fails in enzyme
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
