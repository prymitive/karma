import { useState, useEffect } from "react";

const Mock = (uri: string, options: RequestInit, deps: any[] = []) => {
  const [response, setResponse] = useState(null as null | string);
  const [error] = useState(null as null | string);
  const [isDeleting, setIsDeleting] = useState<boolean>(true);

  useEffect(() => {
    setResponse("success");
    setIsDeleting(false);
    // eslint doesn't like ...deps
    // eslint-disable-next-line
  }, [uri, options, ...deps]);

  return { response, error, isDeleting };
};

const useFetchDelete = jest.fn(Mock);
(useFetchDelete as any).mockReset = () => {
  useFetchDelete.mockClear();
  useFetchDelete.mockImplementation(Mock);
};

export { useFetchDelete };
