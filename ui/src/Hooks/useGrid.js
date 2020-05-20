import { useEffect, useRef } from "react";

import Bricks from "bricks.js";

const useGrid = (sizes) => {
  const ref = useRef(null);
  const grid = useRef(null);

  const repack = () => {
    if (grid.current) {
      grid.current.pack();
    }
  };

  useEffect(() => {
    if (!grid.current && ref.current) {
      grid.current = new Bricks({
        container: ref.current,
        sizes: sizes,
        packed: "packed",
        position: false,
      });
      window.addEventListener("resize", repack);
      grid.current.pack();
    }

    return () => {
      window.removeEventListener("resize", repack);
      grid.current = null;
    };
  }, [sizes]);

  return { ref, repack };
};

export { useGrid };
