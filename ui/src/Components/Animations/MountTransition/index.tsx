import { use, useDeferredValue, FC, ReactNode, ViewTransition } from "react";

import { ThemeContext } from "Components/Theme";

// Mounts and unmounts children with a View Transition. The `in` value is
// deferred so that updates pushed outside a Transition (MobX store changes
// render urgently) still activate the animation: React first renders with
// the old value, then re-renders with the new one in a background
// Transition, which is what <ViewTransition> needs to animate.
const MountTransition: FC<{
  in: boolean;
  enter?: string;
  exit?: string;
  children: ReactNode;
}> = ({ in: inProp, enter, exit, children }) => {
  const context = use(ThemeContext);
  const isAnimated = context.animations.duration !== 0;
  const deferredIn = useDeferredValue(inProp);
  // With animations off the raw value is used so mounts are instant.
  const visible = isAnimated ? deferredIn : inProp;

  if (!visible) return null;
  if (!isAnimated) return <>{children}</>;

  return (
    <ViewTransition default="none" enter={enter} exit={exit}>
      {children}
    </ViewTransition>
  );
};

export { MountTransition };
