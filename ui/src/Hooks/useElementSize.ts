import { useCallback, useState, type RefCallback } from "react";

interface ElementSize {
  width: number;
  height: number;
}

const useElementSize = (): {
  ref: RefCallback<HTMLElement>;
  width: number;
  height: number;
} => {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  const ref = useCallback((node: HTMLElement | null) => {
    // React never passes null to a ref that returns a cleanup.
    if (node === null) return undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1].contentRect;
      setSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
};

export { useElementSize };
