import { useState, useEffect, useCallback, useRef } from "react";

import merge from "lodash/merge";

import promiseRetry from "promise-retry";

import { CommonOptions, FetchRetryConfig } from "Common/Fetch";

const useFetchGet = (uri, { autorun = true, deps = [] } = {}) => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isCanceled = useRef(false);

  const get = useCallback(async () => {
    isCanceled.current = false;

    try {
      setIsLoading(true);
      setRetryCount(0);
      setError(null);
      const res = await promiseRetry(
        (retry, number) =>
          fetch(
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
            )
          ).catch((err) => {
            if (!isCanceled.current) {
              setIsRetrying(true);
              setRetryCount(number);
            }
            return retry(err);
          }),
        FetchRetryConfig
      );
      const json = await res.json();
      if (!isCanceled.current) {
        setResponse(json);
        setIsLoading(false);
        setIsRetrying(false);
      }
    } catch (error) {
      if (!isCanceled.current) {
        setError(error.message);
        setIsLoading(false);
        setIsRetrying(false);
      }
    }
  }, [uri]);

  useEffect(() => {
    if (autorun) get();

    return () => {
      isCanceled.current = true;
    };

    // eslint doesn't like ...deps
    // eslint-disable-next-line
  }, [uri, get, autorun, ...deps]);

  return { response, error, isLoading, isRetrying, retryCount, get };
};

export { useFetchGet };
