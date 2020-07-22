import { useState, useEffect, useRef, ReactNode } from "react";

import { TransitionProps } from "react-transition-group/Transition";

import { useInView } from "react-intersection-observer";

const defaultProps: TransitionProps = {
  in: false,
  classNames: "components-animation-flash",
  timeout: 800,
  appear: false,
  enter: false,
  exit: false,
};

const useFlashTransition = (
  flashOn: ReactNode
): { ref: (node?: Element | null) => void; props: TransitionProps } => {
  const mountRef = useRef<boolean>(false);
  const [ref, inView] = useInView();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [props, setProps] = useState<TransitionProps>(defaultProps);

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
    });
  }, [inView, isPending]);

  return { ref, props };
};

export { useFlashTransition, defaultProps };
