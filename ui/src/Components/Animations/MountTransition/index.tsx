import { use, FC, ReactNode, useEffect, useState } from "react";

import { ThemeContext } from "Components/Theme";

// Must be the same as the exit animation duration of the class prop CSS.
const exitDuration = 150;

// Mounts and unmounts children with a CSS animation. The wrapper only
// carries the animation class, the CSS animates the child element: the
// child is usually positioned with floating-ui and a transform on a
// wrapper would break that positioning.
const MountTransition: FC<{
  in: boolean;
  enter?: string;
  exit?: string;
  children: ReactNode;
}> = ({ in: inProp, enter, exit, children }) => {
  const context = use(ThemeContext);
  const isAnimated = context.animations.duration !== 0;

  // The DOM is kept mounted while the exit animation runs.
  const [isVisible, setIsVisible] = useState<boolean>(inProp);

  useEffect(() => {
    if (inProp) {
      setIsVisible(true);
      return;
    }
    if (!isVisible) return;
    if (!isAnimated) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setIsVisible(false), exitDuration);
    return () => window.clearTimeout(timer);
  }, [inProp, isVisible, isAnimated]);

  if (!isVisible) return null;

  const animationClass = !inProp ? exit : isAnimated ? enter : undefined;

  return (
    <div
      className={
        animationClass
          ? `components-animation-mount ${animationClass}`
          : "components-animation-mount"
      }
    >
      {children}
    </div>
  );
};

export { MountTransition };
