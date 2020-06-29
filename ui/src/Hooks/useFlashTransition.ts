import { useState, useEffect, useRef } from "react";

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

const useFlashTransition = (flashOn: any) => {
  const mountRef = useRef(false);
  const [ref, inView] = useInView();
  const [isPending, setIsPending] = useState(false);
  const [props, setProps] = useState(defaultProps);

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
