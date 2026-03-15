"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { DrawingBoard, type DrawingBoardHandle } from "./DrawingBoard";
import { useFunctionGemma } from "./FunctionGemmaRunner";
import styles from "./DrawingBoardWithAI.module.css";

export default function DrawingBoardWithAI() {
  const drawingRef = useRef<DrawingBoardHandle | null>(null);
  const [inputValue, setInputValue] = useState("");
  const { loadModel, run, status, loadProgress, errorMessage } = useFunctionGemma(drawingRef);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || status === "loading" || status === "running") return;
      run(trimmed);
      setInputValue("");
    },
    [inputValue, run, status]
  );

  const handleClear = useCallback(() => {
    drawingRef.current?.clear();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Drawing Board — FunctionGemma</h1>
      <p className={styles.subtitle}>
        Say things like &ldquo;draw up&rdquo;, &ldquo;go right 50&rdquo;, &ldquo;draw
        left&rdquo;. Model runs locally in the browser (first load may take a moment).
      </p>

      <div className={styles.status}>
        {status === "loading" && (
          <div className={styles.loadingSection}>
            <span className={styles.loadingLabel}>
              Loading {loadProgress.phase}…{loadProgress.file ? ` ${loadProgress.file}` : ""}
            </span>
            <div
              className={styles.loadingBar}
              role="progressbar"
              aria-valuenow={loadProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${loadProgress.percent}%`}
            >
              <div
                className={styles.loadingBarFill}
                style={{ width: `${loadProgress.percent}%` }}
              />
            </div>
          </div>
        )}
        {status === "ready" && "Ready"}
        {status === "running" && "Drawing…"}
        {status === "error" && "Error"}
      </div>
      {errorMessage && (
        <div className={styles.error} role="alert">
          {errorMessage}
        </div>
      )}

      <DrawingBoard
        onReady={(api) => {
          drawingRef.current = api;
        }}
        className={styles.board}
      />

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. draw up, go right 30"
          className={styles.input}
          disabled={status === "loading"}
          aria-label="Drawing command"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={status === "loading" || status === "running"}
        >
          {status === "running" ? "…" : "Draw"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
          aria-label="Clear canvas"
        >
          Clear
        </button>
      </form>
    </div>
  );
}
