// https://github.com/facebook/create-react-app/blob/master/packages/react-app-polyfill/README.md
// IE is not supported (lacks Proxy) but that pollyfill provides fetch and other needed features
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

// https://www.npmjs.com/package/react-intersection-observer#polyfill
import "intersection-observer";

let pollyfillsLoaded: string[] = [];

if ("ResizeObserver" in window === false) {
  pollyfillsLoaded.push("ResizeObserver");
  const module = require("@juggle/resize-observer");
  (window as any).ResizeObserver = module.ResizeObserver;
  (window as any).ResizeObserverEntry = module.ResizeObserverEntry;
}

export default pollyfillsLoaded;
