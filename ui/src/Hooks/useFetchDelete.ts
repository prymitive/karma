import { useState, useEffect } from "react";

import merge from "lodash.merge";

import { CommonOptions } from "Common/Fetch";

export type useFetchDeleteDepsT = string[] | number[];

export interface ResponseStateT {
  response: null | string;
  error: null | string;
  isDeleting: boolean;
}

const useFetchDelete = (
  uri: string,
  options: RequestInit,
  deps: useFetchDeleteDepsT = []
): ResponseStateT => {
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(true);

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
