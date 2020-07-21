import { useEffect, RefObject } from "react";

type Handler = (event: MouseEvent | TouchEvent) => void;

// https://usehooks.com/useOnClickOutside/
function useOnClickOutside(
  ref: RefObject<HTMLElement>,
  handler: Handler,
  enabled: boolean
): void {
  useEffect(() => {
    const listener: { (event: MouseEvent | TouchEvent): void } = (
      event: MouseEvent | TouchEvent
    ) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    if (enabled) {
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);
    }

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}

export { useOnClickOutside };
