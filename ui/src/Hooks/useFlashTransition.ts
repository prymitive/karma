import { useState, useEffect, useRef, ReactNode, RefObject } from "react";

import type { CSSTransitionProps } from "react-transition-group/CSSTransition";

import { useInView } from "react-intersection-observer";

const defaultProps: CSSTransitionProps = {
  in: false,
  classNames: "components-animation-flash",
  timeout: 800,
  appear: false,
  enter: false,
  exit: false,
};

const useFlashTransition = (
  flashOn: ReactNode,
): {
  ref: (node?: Element | null) => void;
  props: CSSTransitionProps;
  nodeRef: RefObject<HTMLElement | null>;
} => {
  const mountRef = useRef<boolean>(false);
  const nodeRef = useRef<HTMLElement | null>(null);
  const [ref, inView] = useInView();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [props, setProps] = useState<CSSTransitionProps>(defaultProps);

  useEffect(() => {
    if (mountRef.current) {
      setIsPending(true);
    } else {
      mountRef.current = true;
    }
  }, [flashOn]);

  useEffect(() => {
    setProps({
      ...defaultProps,
      in: isPending && inView,
      enter: isPending && inView,
      onEntered: () => setIsPending(false),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeRef: nodeRef as any,
    });
  }, [inView, isPending]);

  return { ref, props, nodeRef };
};

export { useFlashTransition, defaultProps };
