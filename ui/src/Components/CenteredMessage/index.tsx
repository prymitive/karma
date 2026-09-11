import { use, FC, ReactNode, ViewTransition } from "react";

import { ThemeContext } from "Components/Theme";

const CenteredMessage: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const context = use(ThemeContext);
  // The boundary must not be toggled by the animations setting, that would
  // remount the children and reset their state.
  const enterAnimation =
    context.animations.duration !== 0 ? "components-animation-fade" : "none";

  return (
    <ViewTransition default="none" enter={enterAnimation}>
      <h1
        className={`${
          className ? className : "display-1 text-placeholder"
        } screen-center`}
      >
        {children}
      </h1>
    </ViewTransition>
  );
};

export { CenteredMessage };
