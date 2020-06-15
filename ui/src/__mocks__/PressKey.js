import { act } from "react-dom/test-utils";

function PressKey(key, code) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: key,
        keyCode: code,
        which: code,
      })
    );
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: key,
        keyCode: code,
        which: code,
      })
    );
  });
}

export { PressKey };
