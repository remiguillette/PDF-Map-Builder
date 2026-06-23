import type { CanvasRect, PageLayout } from "./viewport-virtualization";

export type RenderTileMetadata = {
  tileX: number;
  tileY: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type RenderPageMetadata = PageLayout & {
  documentId: string;
  pageNumber: number;
  tiles?: RenderTileMetadata[];
};

export type RenderScheduleRequest = {
  viewport: CanvasRect;
  zoom: number;
  devicePixelRatio: number;
  pages: RenderPageMetadata[];
};

export type RenderScheduleSnapshot = RenderScheduleRequest & {
  generation: number;
  zoomBucket: number;
};

const MAX_RENDER_ZOOM = 10;

export function getRenderScaleBucket(zoom: number) {
  return Math.max(1, Math.min(MAX_RENDER_ZOOM, Math.ceil(zoom * 4) / 4));
}

function getDocumentKey(pages: RenderPageMetadata[]) {
  return pages
    .map((page) => `${page.documentId}:${page.pageNumber}:${page.id}`)
    .join("|");
}

function getViewportKey(request: RenderScheduleRequest, zoomBucket: number) {
  const pageKey = request.pages
    .map((page) => {
      const tileKey = page.tiles
        ?.map(
          (tile) => `${tile.tileX},${tile.tileY},${tile.width}x${tile.height}`,
        )
        .join(";");
      return `${page.id}@${page.x},${page.y},${page.width}x${page.height}[${tileKey ?? ""}]`;
    })
    .join("|");

  return [
    Math.round(request.viewport.left),
    Math.round(request.viewport.top),
    Math.round(request.viewport.right),
    Math.round(request.viewport.bottom),
    zoomBucket,
    request.devicePixelRatio,
    pageKey,
  ].join(":");
}

export class PdfRenderScheduler {
  private generation = 0;
  private documentKey = "";
  private viewportKey = "";
  private snapshot: RenderScheduleSnapshot | null = null;

  schedule(request: RenderScheduleRequest): RenderScheduleSnapshot {
    const zoomBucket = getRenderScaleBucket(request.zoom);
    const nextDocumentKey = getDocumentKey(request.pages);
    const nextViewportKey = getViewportKey(request, zoomBucket);

    if (
      nextDocumentKey !== this.documentKey ||
      nextViewportKey !== this.viewportKey
    ) {
      this.generation += 1;
      this.documentKey = nextDocumentKey;
      this.viewportKey = nextViewportKey;
    }

    this.snapshot = { ...request, generation: this.generation, zoomBucket };
    return this.snapshot;
  }

  getGeneration() {
    return this.generation;
  }

  isCurrent(generation: number) {
    return generation === this.generation;
  }

  getSnapshot() {
    return this.snapshot;
  }
}
