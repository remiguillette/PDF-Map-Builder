export type CanvasRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CanvasTransform = {
  scale: number;
  positionX: number;
  positionY: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type PageBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_PAGE_BOUNDS = {
  width: 600,
  height: 800,
};

export const VIEWPORT_OVERSCAN_PX = 800;

export function getVisibleCanvasRect(
  viewport: ViewportSize,
  transform: CanvasTransform,
  overscan = VIEWPORT_OVERSCAN_PX,
): CanvasRect {
  const safeScale = transform.scale || 1;
  const left = (-transform.positionX - overscan) / safeScale;
  const top = (-transform.positionY - overscan) / safeScale;
  const right = (viewport.width - transform.positionX + overscan) / safeScale;
  const bottom = (viewport.height - transform.positionY + overscan) / safeScale;

  return { left, top, right, bottom };
}

export function intersectsCanvasRect(
  bounds: PageBounds,
  rect: CanvasRect,
): boolean {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  return (
    bounds.x <= rect.right &&
    right >= rect.left &&
    bounds.y <= rect.bottom &&
    bottom >= rect.top
  );
}
