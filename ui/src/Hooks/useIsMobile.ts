import { mobileBreakpoint } from "Common/Device";
import { useMediaQuery } from "Hooks/useMediaQuery";

const useIsMobile = (): boolean =>
  useMediaQuery(`(max-width: ${mobileBreakpoint - 1}px)`);

export { useIsMobile };
