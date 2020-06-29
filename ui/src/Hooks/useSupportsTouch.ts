import { useState, useEffect, useCallback } from "react";

function useSupportsTouch() {
  const [supportsTouch, setSupportsTouch] = useState(false);

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
