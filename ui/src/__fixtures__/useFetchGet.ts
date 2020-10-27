import { useState, useEffect, useCallback } from "react";

import { MockAPIResponse, MockSilenceResponse } from "__fixtures__/Fetch";
import { FetchGetResultT } from "Hooks/useFetchGet";
import { APIAlertsResponseT, APIManagedSilenceT } from "Models/APITypes";

type responseT = null | string[] | APIAlertsResponseT | APIManagedSilenceT[];

interface mockedDataT {
  response: undefined | responseT;
  error: undefined | null | string;
  isLoading: undefined | boolean;
  isRetrying: undefined | boolean;
  retryCount: undefined | number;
  get: () => void;
  cancelGet: () => void;
}

interface mockFetchStatsT {
  getCalls: string[];
  readonly calls: string[];
  wasCalled: (uri: string) => void;
  reset: () => void;
  mockedData: mockedDataT;
  setMockedData: (data: mockedDataT) => void;
}

const mockGet = jest.fn();
const mockCancelGet = jest.fn();

const MockFetchStats: mockFetchStatsT = {
  getCalls: [],
  get calls() {
    return this.getCalls;
  },
  wasCalled(uri: string) {
    this.getCalls.push(uri);
  },
  reset() {
    this.getCalls = [];
    this.mockedData = {
      response: undefined,
      error: undefined,
      isLoading: undefined,
      isRetrying: undefined,
      retryCount: undefined,
      get: mockGet,
      cancelGet: mockCancelGet,
    };
  },
  mockedData: {
    response: undefined,
    error: undefined,
    isLoading: undefined,
    isRetrying: undefined,
    retryCount: undefined,
    get: mockGet,
    cancelGet: mockCancelGet,
  },
  setMockedData(data: mockedDataT) {
    this.mockedData = data;
  },
};

const useFetchGetMock = (
  uri: string,
  { autorun = true, deps = [] } = {}
): FetchGetResultT<responseT> => {
  const [response, setResponse] = useState(null as responseT);
  const [error] = useState(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying] = useState<boolean>(false);

  const cancelGet = useCallback(() => {}, []);

  const get = useCallback(() => {
    MockFetchStats.wasCalled(uri);

    const mockResponses = [
      // matcher name select suggestions
      {
        uri: "./labelNames.json",
        response: ["cluster", "job", "instance"],
      },
      // matcher value select suggestions
      {
        uri: "./labelValues.json?name=cluster",
        response: ["dev", "staging", "prod"],
      },
      // matcher value counters
      {
        re: /^\.\/alerts\.json\?q=/,
        response: MockAPIResponse(),
      },
      // silence browser
      {
        re: /^.\/silences\.json\?/,
        response: MockSilenceResponse("am", 14),
      },
      // filter autocomplete
      {
        uri: "./autocomplete.json?term=cluster",
        response: [
          "cluster=staging",
          "cluster=prod",
          "cluster=dev",
          "cluster!=staging",
          "cluster!=prod",
          "cluster!=dev",
        ],
      },
      {
        re: /^.\/autocomplete\.json\?term=/,
        response: ["foo=bar", "foo=~bar"],
      },
    ];

    for (const m of mockResponses) {
      if (m.re && uri.match(m.re)) {
        setResponse(m.response);
        setIsLoading(false);
        break;
      } else if (m.uri === uri) {
        setResponse(m.response);
        setIsLoading(false);
        break;
      }
    }
  }, [uri]);

  useEffect(() => {
    if (autorun) get();
    // eslint doesn't like ...deps
    // eslint-disable-next-line
  }, [uri, get, cancelGet, autorun, ...deps]);

  return {
    response:
      MockFetchStats.mockedData.response !== undefined
        ? MockFetchStats.mockedData.response
        : response,
    error:
      MockFetchStats.mockedData.error !== undefined
        ? MockFetchStats.mockedData.error
        : error,
    isLoading:
      MockFetchStats.mockedData.isLoading !== undefined
        ? MockFetchStats.mockedData.isLoading
        : isLoading,
    isRetrying:
      MockFetchStats.mockedData.isRetrying !== undefined
        ? MockFetchStats.mockedData.isRetrying
        : isRetrying,
    retryCount:
      MockFetchStats.mockedData.retryCount !== undefined
        ? MockFetchStats.mockedData.retryCount
        : 0,
    get,
    cancelGet,
  };
};

useFetchGetMock.fetch = MockFetchStats;
useFetchGetMock._mockGet = mockGet;
useFetchGetMock._cancelGet = mockCancelGet;

export { useFetchGetMock };
