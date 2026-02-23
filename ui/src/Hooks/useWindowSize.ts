import { useState, useEffect } from "react";

interface Dimensions {
  width: number;
  height: number;
}

function getSize(): Dimensions {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function useWindowSize(): Dimensions {
  const [windowSize, setWindowSize] = useState<Dimensions>(getSize());

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getSize());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export { useWindowSize };
