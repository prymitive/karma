import { TestEnvironment } from "jest-environment-jsdom";

// jsdom has no ResizeObserver implementation
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no matchMedia implementation
const matchMediaPolyfill = (query: string, width: number) => {
  const maxWidth = /^\(max-width: (\d+)px\)$/.exec(query);
  return {
    matches: maxWidth !== null && width <= Number(maxWidth[1]),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  } as MediaQueryList;
};

type MatchMediaPolyfill = (query: string) => MediaQueryList;

interface GlobalWithBrowserAPIs {
  ResizeObserver: typeof ResizeObserverPolyfill;
  matchMedia: MatchMediaPolyfill;
  window: {
    innerWidth: number;
    ResizeObserver: typeof ResizeObserverPolyfill;
    matchMedia: MatchMediaPolyfill;
  };
}

export default class CustomTestEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.ReadableStream = ReadableStream;
    this.global.fetch = fetch;
    const g = this.global as unknown as GlobalWithBrowserAPIs;
    g.ResizeObserver = ResizeObserverPolyfill;
    g.window.ResizeObserver = ResizeObserverPolyfill;
    const matchMedia = (query: string) =>
      matchMediaPolyfill(query, g.window.innerWidth);
    g.matchMedia = matchMedia;
    g.window.matchMedia = matchMedia;
  }
}
