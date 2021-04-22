import { FC } from "react";

import { components, MenuProps } from "react-select";

import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { OptionT, MultiValueOptionT } from "Common/Select";

export const AnimatedMenu: FC<MenuProps<OptionT, false>> = (props) => {
  return (
    <DropdownSlide in unmountOnExit>
      <components.Menu {...props}>{props.children}</components.Menu>
    </DropdownSlide>
  );
};

export const AnimatedMultiMenu: FC<MenuProps<MultiValueOptionT, true>> = (
  props
) => {
  return (
    <DropdownSlide in unmountOnExit>
      <components.Menu {...props}>{props.children}</components.Menu>
    </DropdownSlide>
  );
};
