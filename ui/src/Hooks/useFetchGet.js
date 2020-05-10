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
              return retry(err);
            }
          }),
        FetchRetryConfig
      );

      let body;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      if (res.ok) {
        setResponse(body);
      } else {
        setError(body);
      }
      setIsLoading(false);
      setIsRetrying(false);
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
  }, [uri, get, autorun, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { response, error, isLoading, isRetrying, retryCount, get };
};

export { useFetchGet };
