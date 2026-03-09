import { useEffect, useRef, useState, Ref } from "react";

import Bricks, { SizeDetail, Instance } from "bricks.js";

const useGrid = (
  sizes: SizeDetail[],
): { ref: Ref<HTMLDivElement>; repack: () => void } => {
  const ref = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Instance | null>(null);
  const [repack, setRepack] = useState<() => void>(() => () => {});

  useEffect(() => {
    if (!gridRef.current && ref.current) {
      gridRef.current = Bricks({
        container: ref.current,
        sizes: sizes,
        packed: "packed",
        position: false,
      });
      window.addEventListener("resize", gridRef.current.pack);
      gridRef.current.pack();
      setRepack(() => () => {
        gridRef.current && gridRef.current.pack();
      });
    }

    return () => {
      if (gridRef.current)
        window.removeEventListener("resize", gridRef.current.pack);
      gridRef.current = null;
    };
  }, [sizes]);

  return { ref, repack };
};

export { useGrid };
