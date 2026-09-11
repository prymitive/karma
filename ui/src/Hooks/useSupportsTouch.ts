import { useState, useEffect } from "react";

function useSupportsTouch(): boolean {
  const [supportsTouch, setSupportsTouch] = useState<boolean>(false);

  useEffect(() => {
    const onTouchStart = () => setSupportsTouch(true);
    window.addEventListener("touchstart", onTouchStart);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return supportsTouch;
}

export { useSupportsTouch };
