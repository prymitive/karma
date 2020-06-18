import { useState, useEffect, useRef } from "react";

import { useInView } from "react-intersection-observer";

const defaultProps = {
  in: false,
  classNames: "components-animation-flash",
  timeout: 800,
  appear: false,
  enter: false,
  exit: false,
};

const useFlashTransition = (flashOn) => {
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
