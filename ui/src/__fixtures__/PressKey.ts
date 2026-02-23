import { act } from "react-dom/test-utils";

function PressKey(key: string, code: number): void {
  act(() => {
    const eventInit = {
      key: key,
      code: key,
      keyCode: code,
      which: code,
      bubbles: true,
    } as KeyboardEventInit;
    document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    document.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  });
}

export { PressKey };
