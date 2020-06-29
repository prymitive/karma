import { useState, useEffect } from "react";

import merge from "lodash.merge";

import { CommonOptions } from "Common/Fetch";

const useFetchDelete = (uri: string, options: RequestInit, deps = []) => {
  const [response, setResponse] = useState(null as string | null);
  const [error, setError] = useState(null as string | null);
  const [isDeleting, setIsDeleting] = useState(true);

  useEffect(() => {
    // https://dev.to/pallymore/clean-up-async-requests-in-useeffect-hooks-90h
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setIsDeleting(true);
        const res = await fetch(
          uri,
          merge({}, { method: "DELETE" }, CommonOptions, options)
        );
        const text = await res.text();

        if (!isCancelled) {
          if (res.ok) {
            setResponse(text);
            setIsDeleting(false);
          } else {
            setError(text);
            setIsDeleting(false);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setError(error.message);
          setIsDeleting(false);
        }
      }
    };
    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [uri, options, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { response, error, isDeleting };
};

export { useFetchDelete };
