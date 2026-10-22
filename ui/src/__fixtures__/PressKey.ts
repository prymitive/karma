import { act } from "react";

function PressKey(key: string): void {
  act(() => {
    const eventInit: KeyboardEventInit = {
      key: key,
      code: key,
      bubbles: true,
    };
    document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    document.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  });
}

export { PressKey };
