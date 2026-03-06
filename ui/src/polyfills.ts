declare global {
  interface Window {
    ResizeObserver: () => void;
  }
}

const pollyfillsLoaded: string[] = [];

if ("ResizeObserver" in window === false) {
  pollyfillsLoaded.push("ResizeObserver");
  const module = require("@juggle/resize-observer"); // eslint-disable-line @typescript-eslint/no-require-imports
  (window as Window).ResizeObserver = module.ResizeObserver;
}

export default pollyfillsLoaded;
