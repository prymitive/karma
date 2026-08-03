import {
  use,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";

import { useInView } from "react-intersection-observer";

import { ThemeContext } from "Components/Theme";

// must match $duration in Styles/Components/_Flash.scss
const flashDuration = 800;

const useFlashTransition = (
  flashOn: ReactNode,
): {
  ref: (node: HTMLElement | null) => void;
} => {
  const context = use(ThemeContext);
  const mountRef = useRef<boolean>(false);
  const nodeRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ref, inView] = useInView();
  const [isPending, setIsPending] = useState<boolean>(false);

  useEffect(() => {
    if (mountRef.current) {
      setIsPending(true);
    } else {
      mountRef.current = true;
    }
  }, [flashOn]);

  useEffect(() => {
    if (!isPending) {
      return;
    }
    // drop stale flashes rather than play them if animations get re-enabled
    if (context.animations.duration === 0) {
      setIsPending(false);
      return;
    }
    if (inView && nodeRef.current) {
      const node = nodeRef.current;
      // adding the class starts the CSS animation, removing it after the
      // duration passes allows the next flash to restart it without a reflow
      node.classList.add("components-animation-flash");
      timerRef.current = setTimeout(
        () => node.classList.remove("components-animation-flash"),
        flashDuration,
      );
      setIsPending(false);
    }
  }, [inView, isPending, context.animations.duration]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      ref(node);
      nodeRef.current = node;
    },
    [ref],
  );

  return { ref: combinedRef };
};

export { useFlashTransition };
