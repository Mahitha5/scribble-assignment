import { useCallback, useEffect, useRef, useState } from "react";
import type { Point, StrokeSegment } from "../services/api";

interface DrawingCanvasProps {
  mode: "draw" | "view";
  strokes: StrokeSegment[];
  onStrokeComplete?: (stroke: { points: Point[]; color: string; lineWidth: number }) => Promise<void>;
}

const DEFAULT_COLOR = "#000000";
const DEFAULT_LINE_WIDTH = 4;

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: StrokeSegment,
  width: number,
  height: number
) {
  if (stroke.points.length < 2) {
    return;
  }

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);

  for (let index = 1; index < stroke.points.length; index += 1) {
    context.lineTo(stroke.points[index].x * width, stroke.points[index].y * height);
  }

  context.stroke();
}

export function DrawingCanvas({ mode, strokes, onStrokeComplete }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointsRef = useRef<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const replayStrokes = useCallback(
    (extraStroke?: { points: Point[]; color: string; lineWidth: number }) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const stroke of strokes) {
        drawStroke(context, stroke, canvas.width, canvas.height);
      }

      if (extraStroke && extraStroke.points.length >= 2) {
        drawStroke(
          context,
          {
            id: "in-progress",
            points: extraStroke.points,
            color: extraStroke.color,
            lineWidth: extraStroke.lineWidth
          },
          canvas.width,
          canvas.height
        );
      }
    },
    [strokes]
  );

  useEffect(() => {
    if (isDrawing) {
      return;
    }

    replayStrokes();
  }, [isDrawing, replayStrokes]);

  function normalizePoint(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw") {
      return;
    }

    const point = normalizePoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointsRef.current = [point];
    setIsDrawing(true);
    replayStrokes({ points: activePointsRef.current, color: DEFAULT_COLOR, lineWidth: DEFAULT_LINE_WIDTH });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !isDrawing) {
      return;
    }

    const point = normalizePoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    activePointsRef.current = [...activePointsRef.current, point];
    replayStrokes({ points: activePointsRef.current, color: DEFAULT_COLOR, lineWidth: DEFAULT_LINE_WIDTH });
  }

  async function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !isDrawing) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);

    const completedPoints = [...activePointsRef.current];
    activePointsRef.current = [];

    if (completedPoints.length < 2 || !onStrokeComplete) {
      replayStrokes();
      return;
    }

    await onStrokeComplete({
      points: completedPoints,
      color: DEFAULT_COLOR,
      lineWidth: DEFAULT_LINE_WIDTH
    });
  }

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas drawing-canvas--${mode}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
