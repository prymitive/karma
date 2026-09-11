import { use, FC, ReactNode, ViewTransition } from "react";

import { ThemeContext } from "Components/Theme";

const CenteredMessage: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const context = use(ThemeContext);

  const heading = (
    <h1
      className={`${
        className ? className : "display-1 text-placeholder"
      } screen-center`}
    >
      {children}
    </h1>
  );

  if (!context.animations.duration) return heading;

  return (
    <ViewTransition default="none" enter="components-animation-fade">
      {heading}
    </ViewTransition>
  );
};

export { CenteredMessage };
