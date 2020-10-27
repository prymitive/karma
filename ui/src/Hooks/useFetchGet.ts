import { useState, useEffect, useCallback, useRef } from "react";

import merge from "lodash.merge";

import promiseRetry from "promise-retry";

import { CommonOptions, FetchRetryConfig } from "Common/Fetch";

export type FetchFunctionT = (request: RequestInfo) => Promise<Response>;

export interface FetchGetOptionsT {
  autorun?: boolean;
  deps?: string[] | number[];
  fetcher?: null | FetchFunctionT;
}

interface ResponseState<T> {
  response: null | T;
  error: null | string;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

export interface FetchGetResultT<T> {
  response: null | T;
  error: null | string;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  get: () => void;
  cancelGet: () => void;
}

const useFetchGet = <T>(
  uri: string,
  { autorun = true, deps = [], fetcher = null }: FetchGetOptionsT = {}
): FetchGetResultT<T> => {
  const [response, setResponse] = useState<ResponseState<T>>({
    response: null,
    error: null,
    isLoading: autorun,
    isRetrying: false,
    retryCount: 0,
  });
  const isCanceled = useRef<boolean>(false);

  const cancelGet = useCallback(() => {
    isCanceled.current = true;
  }, []);

  const get = useCallback(async () => {
    isCanceled.current = false;

    try {
      setResponse((r) => ({
        ...r,
        isLoading: true,
        isRetrying: false,
        retryCount: 0,
      }));

      const res = await promiseRetry(
        (retry: (err: Error) => Promise<Response>, n: number) =>
          (fetcher || fetch)(
            uri,
            merge(
              {},
              {
                method: "GET",
              },
              CommonOptions,
              {
                mode: n <= FetchRetryConfig.retries ? "cors" : "no-cors",
              }
            ) as RequestInit
          ).catch((err: Error) => {
            if (!isCanceled.current) {
              setResponse((r) => ({
                ...r,
                isRetrying: true,
                retryCount: n,
              }));
              return retry(err);
            }
          }),
        FetchRetryConfig
      );

      if (res !== undefined && !isCanceled.current) {
        let body;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          body = await res.json();
        } else {
          body = await res.text();
        }

        if (!isCanceled.current) {
          if (res.ok) {
            setResponse({
              response: body,
              error: null,
              isLoading: false,
              isRetrying: false,
              retryCount: 0,
            });
          } else {
            setResponse({
              response: null,
              error: body,
              isLoading: false,
              isRetrying: false,
              retryCount: 0,
            });
          }
        }
      }
    } catch (error) {
      setResponse((r) => ({
        ...r,
        error: error.message,
        isLoading: false,
        isRetrying: false,
      }));
    }
  }, [uri, fetcher]);

  useEffect(() => {
    if (autorun) get();

    return () => cancelGet();
  }, [uri, get, cancelGet, autorun, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { get, cancelGet, ...response };
};

export { useFetchGet };
