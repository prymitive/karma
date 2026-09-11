import { useLayoutEffect, useRef, useState, Ref } from "react";

import Bricks, { SizeDetail, Instance } from "bricks.js";

const useGrid = (
  sizes: SizeDetail[],
): { ref: Ref<HTMLDivElement>; repack: () => void } => {
  const ref = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Instance | null>(null);
  const [repack, setRepack] = useState<() => void>(() => () => {});

  // A layout effect is needed so the first pack runs before the browser
  // captures the new state of a view transition; a passive effect would
  // let groups render at unpacked positions and jump after the animation.
  useLayoutEffect(() => {
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
