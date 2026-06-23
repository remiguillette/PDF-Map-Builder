import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "pdf-canvas-positions-v2";

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

export function useCanvasPositions(itemIds: string[]) {
  const [positions, setPositions] =
    useState<Record<string, Position>>(loadPositions);

  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      itemIds.forEach((id, i) => {
        if (!next[id]) {
          const col = i % 4;
          const row = Math.floor(i / 4);
          next[id] = { x: 80 + col * 760, y: 80 + row * 1020 };
          changed = true;
        }
      });
      if (changed) {
        savePositions(next);
        return next;
      }
      return prev;
    });
  }, [itemIds]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { x, y } };
      savePositions(next);
      return next;
    });
  }, []);

  const updatePositions = useCallback(
    (nextPositions: Record<string, Position>) => {
      setPositions((prev) => {
        const next = { ...prev, ...nextPositions };
        savePositions(next);
        return next;
      });
    },
    [],
  );

  return { positions, updatePosition, updatePositions };
}
