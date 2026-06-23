import { useTransformContext } from "react-zoom-pan-pinch";

interface GridBackgroundProps {
  show: boolean;
}

export function GridBackground({ show }: GridBackgroundProps) {
  const context = useTransformContext();
  if (!show) return null;

  const { positionX, positionY, scale } = context.state;
  const gridSize = 40;
  const scaledGrid = gridSize * scale;

  const offsetX = ((positionX % scaledGrid) + scaledGrid) % scaledGrid;
  const offsetY = ((positionY % scaledGrid) + scaledGrid) % scaledGrid;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.25) 1.5px, transparent 1.5px)`,
        backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  );
}
