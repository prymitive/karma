import { useState, useEffect, useCallback } from "react";

import merge from "lodash.merge";

import { CommonOptions } from "Common/Fetch";

export interface UpstreamT {
  uri: string;
  options: RequestInit;
}

export type FetchFunctionT = (request: RequestInfo) => Promise<Response>;

export interface FetchAnyOptionsT {
  fetcher?: null | FetchFunctionT;
}

interface ResponseState<T> {
  response: T | null;
  error: string | null;
  responseURI: string | null;
  inProgress: boolean;
}

const useFetchAny = <T>(
  upstreams: UpstreamT[],
  { fetcher = null }: FetchAnyOptionsT = {}
): {
  response: T | null;
  error: string | null;
  responseURI: string | null;
  inProgress: boolean;
  reset: () => void;
} => {
  const [index, setIndex] = useState<number>(0);
  const [response, setResponse] = useState<ResponseState<T>>({
    response: null,
    error: null,
    responseURI: null,
    inProgress: false,
  });

  const reset = useCallback(() => {
    setIndex(0);
    setResponse({
      response: null,
      error: null,
      responseURI: null,
      inProgress: false,
    });
  }, []);

  useEffect(() => {
    // https://dev.to/pallymore/clean-up-async-requests-in-useeffect-hooks-90h
    let isCancelled = false;

    const fetchData = async () => {
      const { uri, options } = upstreams[index];

      setResponse({
        response: null,
        error: null,
        responseURI: null,
        inProgress: true,
      });
      try {
        const res = await (fetcher || fetch)(
          uri,
          merge({}, { method: "GET" }, CommonOptions, options) as RequestInit
        );

        if (!isCancelled) {
          let body;
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            body = await res.json();
          } else {
            body = await res.text();
          }

          if (!isCancelled) {
            if (res.ok) {
              setResponse({
                response: body,
                error: null,
                responseURI: uri,
                inProgress: false,
              });
            } else {
              if (upstreams.length > index + 1) {
                setIndex(index + 1);
              } else {
                setResponse({
                  response: null,
                  error: body,
                  responseURI: null,
                  inProgress: false,
                });
              }
            }
          }
        }
      } catch (error) {
        if (!isCancelled) {
          if (upstreams.length > index + 1) {
            setIndex(index + 1);
          } else {
            setResponse({
              response: null,
              error: error.message,
              responseURI: null,
              inProgress: false,
            });
          }
        }
      }
    };

    if (upstreams.length > 0) {
      fetchData();
    } else {
      reset();
    }

    return () => {
      isCancelled = true;
    };
  }, [upstreams, index, reset, fetcher]);

  return { ...response, reset };
};

export { useFetchAny };
