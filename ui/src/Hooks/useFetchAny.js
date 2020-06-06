import { useState, useEffect } from "react";

import merge from "lodash.merge";

import { CommonOptions } from "Common/Fetch";

const useFetchAny = (upstreams) => {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [inProgress, setInProgress] = useState(true);
  const [responseURI, setResponseURI] = useState(null);

  useEffect(() => {
    // https://dev.to/pallymore/clean-up-async-requests-in-useeffect-hooks-90h
    let isCancelled = false;

    const fetchData = async () => {
      const { uri, options } = upstreams[index];

      try {
        setInProgress(true);
        const res = await fetch(
          uri,
          merge({}, { method: "GET" }, CommonOptions, options)
        );

        if (!isCancelled) {
          let body;
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            body = await res.json();
          } else {
            body = await res.text();
          }

          if (res.ok) {
            setResponse(body);
            setResponseURI(uri);
            setInProgress(false);
          } else {
            if (upstreams.length > index + 1) {
              setIndex(index + 1);
            } else {
              setError(body);
              setInProgress(false);
            }
          }
        }
      } catch (error) {
        if (!isCancelled) {
          if (upstreams.length > index + 1) {
            setIndex(index + 1);
          } else {
            setError(error.message);
            setInProgress(false);
          }
        }
      }
    };

    if (upstreams.length > 0) {
      fetchData();
    } else {
      setInProgress(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [upstreams, index]);

  return { response, error, inProgress, responseURI };
};

export { useFetchAny };
