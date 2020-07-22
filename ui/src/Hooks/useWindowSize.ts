import { useState, useEffect } from "react";

interface Dimentions {
  width: number;
  height: number;
}

function getSize(): Dimentions {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function useWindowSize(): Dimentions {
  const [windowSize, setWindowSize] = useState<Dimentions>(getSize());

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
