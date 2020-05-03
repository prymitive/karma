import { useState, useEffect } from "react";

const Mock = (uri, options, deps = []) => {
  const [response, setResponse] = useState(null);
  const [error] = useState(null);
  const [isDeleting, setIsDeleting] = useState(true);

  useEffect(() => {
    setResponse("success");
    setIsDeleting(false);
    // eslint doesn't like ...deps
    // eslint-disable-next-line
  }, [uri, options, ...deps]);

  return { response, error, isDeleting };
};

const useFetchDelete = jest.fn(Mock);
useFetchDelete.mockReset = () => {
  useFetchDelete.mockClear();
  useFetchDelete.mockImplementation(Mock);
};

export { useFetchDelete };
