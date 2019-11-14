import merge from "lodash.merge";

const CommonOptions = {
  credentials: "include",
  redirect: "follow"
};

const FetchGet = async (uri, options) =>
  await fetch(uri, merge({}, { method: "GET" }, CommonOptions, options));

const FetchPost = async (uri, options) =>
  await fetch(uri, merge({}, { method: "POST" }, CommonOptions, options));

const FetchDelete = async (uri, options) =>
  await fetch(uri, merge({}, { method: "DELETE" }, CommonOptions, options));

export { CommonOptions, FetchGet, FetchPost, FetchDelete };
