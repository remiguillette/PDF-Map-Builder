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

export type PageLayout = PageBounds & {
  id: string;
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

type SpatialCellKey = `${number}:${number}`;

export type PageSpatialIndex = {
  query: (rect: CanvasRect) => string[];
};

const DEFAULT_SPATIAL_CELL_SIZE = 1200;

function getCellKey(column: number, row: number): SpatialCellKey {
  return `${column}:${row}`;
}

function getCellRange(
  min: number,
  max: number,
  cellSize: number,
): [number, number] {
  return [Math.floor(min / cellSize), Math.floor(max / cellSize)];
}

export function createPageSpatialIndex(
  layouts: PageLayout[],
  cellSize = DEFAULT_SPATIAL_CELL_SIZE,
): PageSpatialIndex {
  const cells = new Map<SpatialCellKey, PageLayout[]>();

  for (const layout of layouts) {
    const [startColumn, endColumn] = getCellRange(
      layout.x,
      layout.x + layout.width,
      cellSize,
    );
    const [startRow, endRow] = getCellRange(
      layout.y,
      layout.y + layout.height,
      cellSize,
    );

    for (let column = startColumn; column <= endColumn; column += 1) {
      for (let row = startRow; row <= endRow; row += 1) {
        const key = getCellKey(column, row);
        const cell = cells.get(key);

        if (cell) {
          cell.push(layout);
        } else {
          cells.set(key, [layout]);
        }
      }
    }
  }

  return {
    query(rect) {
      const [startColumn, endColumn] = getCellRange(
        rect.left,
        rect.right,
        cellSize,
      );
      const [startRow, endRow] = getCellRange(rect.top, rect.bottom, cellSize);
      const seen = new Set<string>();
      const ids: string[] = [];

      for (let column = startColumn; column <= endColumn; column += 1) {
        for (let row = startRow; row <= endRow; row += 1) {
          const cell = cells.get(getCellKey(column, row));
          if (!cell) continue;

          for (const layout of cell) {
            if (seen.has(layout.id) || !intersectsCanvasRect(layout, rect)) {
              continue;
            }

            seen.add(layout.id);
            ids.push(layout.id);
          }
        }
      }

      return ids;
    },
  };
}
