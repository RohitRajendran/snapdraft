export const MOBILE_OVERLAY_BREAKPOINT_PX = 730;
export const MOBILE_TOOLBAR_INSET_PX = 112;
export const MOBILE_OVERLAY_CLEARANCE_PX = 116;
export const FIT_CONTENT_PADDING_PX = 60;

export function shouldUseMobileOverlayLayout(width: number): boolean {
  return width <= MOBILE_OVERLAY_BREAKPOINT_PX;
}
