import merge from "lodash.merge";

import promiseRetry from "promise-retry";

const CommonOptions = {
  mode: "cors",
  credentials: "include",
  redirect: "follow",
};

const FetchRetryConfig = {
  retries: 9,
  minTimeout: 2000,
  maxTimeout: 5000,
};

const FetchGet = async (uri, options, beforeRetry) =>
  await promiseRetry(
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
          },
          options
        )
      ).catch((err) => {
        beforeRetry && beforeRetry(number);
        return retry(err);
      }),
    FetchRetryConfig
  );

export { CommonOptions, FetchGet, FetchRetryConfig };
