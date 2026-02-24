import type { ReactElement } from "react";

import { components, MenuProps } from "react-select";

import { DropdownSlide } from "Components/Animations/DropdownSlide";
import type { MultiValueOptionT, OptionT } from "Common/Select";

export const AnimatedMenu = (
  props: MenuProps<OptionT, false>,
): ReactElement => (
  <DropdownSlide in unmountOnExit>
    <components.Menu {...props}>{props.children}</components.Menu>
  </DropdownSlide>
);

export const AnimatedMenuMultiple = (
  props: MenuProps<OptionT, true>,
): ReactElement => (
  <DropdownSlide in unmountOnExit>
    <components.Menu {...props}>{props.children}</components.Menu>
  </DropdownSlide>
);

export const AnimatedMultiMenu = (
  props: MenuProps<MultiValueOptionT, true>,
): ReactElement => {
  return (
    <DropdownSlide in unmountOnExit>
      <components.Menu {...props}>{props.children}</components.Menu>
    </DropdownSlide>
  );
};
