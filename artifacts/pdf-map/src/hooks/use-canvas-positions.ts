import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "pdf-canvas-positions";

type Position = { x: number; y: number };

function loadPositions(): Record<string, Position> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, Position>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore
  }
}

export function useCanvasPositions(docIds: string[]) {
  const [positions, setPositions] = useState<Record<string, Position>>(loadPositions);

  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      docIds.forEach((id, i) => {
        if (!next[id]) {
          const col = i % 3;
          const row = Math.floor(i / 3);
          next[id] = { x: 80 + col * 740, y: 80 + row * 960 };
          changed = true;
        }
      });
      if (changed) {
        savePositions(next);
        return next;
      }
      return prev;
    });
  }, [docIds]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { x, y } };
      savePositions(next);
      return next;
    });
  }, []);

  return { positions, updatePosition };
}
