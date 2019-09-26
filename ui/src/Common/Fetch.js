import merge from "lodash.merge";

const FetchWithCredentials = async (uri, options) =>
  await fetch(uri, merge({}, { credentials: "include" }, options));

export { FetchWithCredentials };
