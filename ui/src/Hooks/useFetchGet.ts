import { useState, useEffect, useCallback, useRef } from "react";

import merge from "lodash.merge";

import promiseRetry from "promise-retry";

import { CommonOptions, FetchRetryConfig } from "Common/Fetch";

const useFetchGet = (
  uri: string,
  { autorun = true, deps = [], fetcher = null } = {}
) => {
  const [response, setResponse] = useState(null as any);
  const [error, setError] = useState(null as string | null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isCanceled = useRef(false);

  const cancelGet = useCallback(() => {
    isCanceled.current = true;
  }, []);

  const get = useCallback(async () => {
    isCanceled.current = false;

    try {
      setIsLoading(true);
      setRetryCount(0);
      setError(null);
      const res = await promiseRetry(
        (retry: Function, number: number) =>
          (fetcher || fetch)(
            uri,
            merge(
              {},
              {
                method: "GET",
              },
              CommonOptions,
              {
                mode: number <= FetchRetryConfig.retries ? "cors" : "no-cors",
              }
            ) as RequestInit
          ).catch((err) => {
            if (!isCanceled.current) {
              setIsRetrying(true);
              setRetryCount(number);
              return retry(err);
            }
          }),
        FetchRetryConfig
      );

      if (!isCanceled.current) {
        let body;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          body = await res.json();
        } else {
          body = await res.text();
        }

        if (!isCanceled.current) {
          if (res.ok) {
            setResponse(body);
          } else {
            setError(body);
          }
          setIsLoading(false);
          setIsRetrying(false);
        }
      }
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [uri, fetcher]);

  useEffect(() => {
    if (autorun) get();

    return () => cancelGet();
  }, [uri, get, cancelGet, autorun, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { response, error, isLoading, isRetrying, retryCount, get, cancelGet };
};

export { useFetchGet };
