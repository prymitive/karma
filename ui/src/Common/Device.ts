const mobileBreakpoint = 768;

function IsMobile(): boolean {
  return window.innerWidth < mobileBreakpoint;
}

export { IsMobile, mobileBreakpoint };
