import { components, MenuProps } from "react-select";

import { DropdownSlide } from "Components/Animations/DropdownSlide";
import type { MultiValueOptionT, OptionT } from "Common/Select";

export const AnimatedMenu = (props: MenuProps<OptionT, false>): JSX.Element => (
  <DropdownSlide in unmountOnExit>
    <components.Menu {...props}>{props.children}</components.Menu>
  </DropdownSlide>
);

export const AnimatedMenuMultiple = (
  props: MenuProps<OptionT, true>,
): JSX.Element => (
  <DropdownSlide in unmountOnExit>
    <components.Menu {...props}>{props.children}</components.Menu>
  </DropdownSlide>
);

export const AnimatedMultiMenu = (
  props: MenuProps<MultiValueOptionT, true>,
): JSX.Element => {
  return (
    <DropdownSlide in unmountOnExit>
      <components.Menu {...props}>{props.children}</components.Menu>
    </DropdownSlide>
  );
};
