import { useState, useEffect, useCallback } from "react";

function useSupportsTouch(): boolean {
  const [supportsTouch, setSupportsTouch] = useState<boolean>(false);

  const handler = useCallback(() => setSupportsTouch(true), []);

  useEffect(() => {
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("touchstart", handler);
    };
  }, [handler]);

  return supportsTouch;
}

export { useSupportsTouch };
