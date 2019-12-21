import merge from "lodash/merge";

import promiseRetry from "promise-retry";

const CommonOptions = {
  credentials: "include",
  redirect: "follow"
};

const FetchRetryConfig = {
  retries: 10,
  minTimeout: 2000,
  maxTimeout: 5000
};

const FetchGet = async (uri, options, retryOptions) =>
  await promiseRetry(
    (retry, number) =>
      fetch(
        uri,
        merge(
          {},
          {
            method: "GET",
            mode:
              number <= Math.round(FetchRetryConfig.retries * 0.8)
                ? "cors"
                : "no-cors"
          },
          CommonOptions,
          options
        )
      ).catch(retry),
    FetchRetryConfig
  );

const FetchPost = async (uri, options) =>
  await fetch(uri, merge({}, { method: "POST" }, CommonOptions, options));

const FetchDelete = async (uri, options) =>
  await fetch(uri, merge({}, { method: "DELETE" }, CommonOptions, options));

export { CommonOptions, FetchGet, FetchPost, FetchDelete, FetchRetryConfig };
