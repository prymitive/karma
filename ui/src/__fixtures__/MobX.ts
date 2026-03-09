import { autorun } from "mobx";

function inReactiveContext<T>(fn: () => T): T {
  let result: T;
  autorun(() => {
    result = fn();
  })();
  return result!;
}

export { inReactiveContext };
