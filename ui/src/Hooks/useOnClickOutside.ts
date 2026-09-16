import { useEffect, RefObject, FragmentInstance } from "react";

type Handler = (event: MouseEvent | TouchEvent) => void;

// The FragmentInstance methods are not declared in the React types, so this
// is the minimal shape the containment check needs.
interface ComparableNode {
  compareDocumentPosition: (other: Node) => number;
}

// https://usehooks.com/useOnClickOutside/
function useOnClickOutside(
  ref: RefObject<HTMLElement | null> | RefObject<FragmentInstance | null>,
  handler: Handler,
  enabled: boolean,
): void {
  useEffect(() => {
    const listener: { (event: MouseEvent | TouchEvent): void } = (
      event: MouseEvent | TouchEvent,
    ) => {
      const node = ref.current as ComparableNode | null;
      if (node === null) {
        return;
      }
      const target = event.target as Node;
      // Ignore the root and its descendants.
      if (
        node === target ||
        (node.compareDocumentPosition(target) &
          Node.DOCUMENT_POSITION_CONTAINED_BY) !==
          0
      ) {
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
