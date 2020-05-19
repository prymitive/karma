import { useEffect, useState, useRef } from "react";

import { useAnimation } from "framer-motion";

import { useInView } from "react-intersection-observer";

const useFlashAnimation = (spyOn) => {
  const mountRef = useRef(false);
  const animate = useAnimation();
  const [isPending, setIsPending] = useState(false);
  const [ref, inView] = useInView();

  useEffect(() => {
    if (mountRef.current) {
      setIsPending(true);
    } else {
      mountRef.current = true;
    }
  }, [spyOn]);

  useEffect(() => {
    if (inView && isPending) {
      animate.start({
        opacity: [1, 0, 1, 0, 1],
      });
      setIsPending(false);
    }
  }, [isPending, inView, animate]);

  return [ref, animate];
};

export { useFlashAnimation };
