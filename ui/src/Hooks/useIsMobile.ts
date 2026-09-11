import { useWindowSize } from "Hooks/useWindowSize";
import { mobileBreakpoint } from "Common/Device";

const useIsMobile = (): boolean => useWindowSize().width < mobileBreakpoint;

export { useIsMobile };
