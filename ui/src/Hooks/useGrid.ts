import { useEffect, useRef, useState } from "react";

import Bricks, { SizeDetail, Instance } from "bricks.js";

const useGrid = (sizes: SizeDetail[]) => {
  const ref = useRef(null as Node | null);
  const grid = useRef(null as Instance | null);
  const [repack, setRepack] = useState(() => () => {});

  useEffect(() => {
    if (!grid.current && ref.current) {
      grid.current = Bricks({
        container: ref.current,
        sizes: sizes,
        packed: "packed",
        position: false,
      });
      window.addEventListener("resize", grid.current.pack);
      grid.current.pack();
      setRepack(() => () => {
        grid.current && grid.current.pack();
      });
    }

    return () => {
      if (grid.current) window.removeEventListener("resize", grid.current.pack);
      grid.current = null;
    };
  }, [sizes]);

  return { ref, repack };
};

export { useGrid };
