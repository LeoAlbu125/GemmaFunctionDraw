"use client";

import { useRef, useCallback, useEffect } from "react";
import styles from "./DrawingBoard.module.css";

const DEFAULT_STEP = 20;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export type DrawCommand = "draw_up" | "draw_down" | "draw_left" | "draw_right";

export interface DrawingBoardHandle {
  drawUp: (distance?: number) => void;
  drawDown: (distance?: number) => void;
  drawLeft: (distance?: number) => void;
  drawRight: (distance?: number) => void;
  clear: () => void;
}

interface DrawingBoardProps {
  onReady?: (api: DrawingBoardHandle) => void;
  className?: string;
}

export function DrawingBoard({ onReady, className }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const penRef = useRef<{ x: number; y: number; penDown: boolean }>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    penDown: true,
  });

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const drawLine = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [getCtx]
  );

  const drawUp = useCallback(
    (distance: number = DEFAULT_STEP) => {
      const pen = penRef.current;
      const newY = Math.max(0, pen.y - distance);
      if (pen.penDown) {
        drawLine(pen.x, pen.y, pen.x, newY);
      }
      pen.y = newY;
    },
    [drawLine]
  );

  const drawDown = useCallback(
    (distance: number = DEFAULT_STEP) => {
      const canvas = canvasRef.current;
      const pen = penRef.current;
      const maxY = canvas ? canvas.height : CANVAS_HEIGHT;
      const newY = Math.min(maxY, pen.y + distance);
      if (pen.penDown) {
        drawLine(pen.x, pen.y, pen.x, newY);
      }
      pen.y = newY;
    },
    [drawLine]
  );

  const drawLeft = useCallback(
    (distance: number = DEFAULT_STEP) => {
      const pen = penRef.current;
      const newX = Math.max(0, pen.x - distance);
      if (pen.penDown) {
        drawLine(pen.x, pen.y, newX, pen.y);
      }
      pen.x = newX;
    },
    [drawLine]
  );

  const drawRight = useCallback(
    (distance: number = DEFAULT_STEP) => {
      const canvas = canvasRef.current;
      const pen = penRef.current;
      const maxX = canvas ? canvas.width : CANVAS_WIDTH;
      const newX = Math.min(maxX, pen.x + distance);
      if (pen.penDown) {
        drawLine(pen.x, pen.y, newX, pen.y);
      }
      pen.x = newX;
    },
    [drawLine]
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    penRef.current.x = canvas.width / 2;
    penRef.current.y = canvas.height / 2;
  }, [getCtx]);

  useEffect(() => {
    onReady?.({
      drawUp,
      drawDown,
      drawLeft,
      drawRight,
      clear,
    });
  }, [onReady, drawUp, drawDown, drawLeft, drawRight, clear]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    penRef.current.x = canvas.width / 2;
    penRef.current.y = canvas.height / 2;
  }, []);

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={styles.canvas}
      />
    </div>
  );
}
