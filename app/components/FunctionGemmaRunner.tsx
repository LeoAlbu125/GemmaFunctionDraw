"use client";

import { useCallback, useRef, useState } from "react";
import {
  SYSTEM_PROMPT,
  DRAW_TOOL_SCHEMA,
  parseFunctionCall,
} from "@/lib/functionGemma";
import { createIndexedDBCache } from "@/lib/indexedDBCache";
import type { DrawingBoardHandle } from "./DrawingBoard";

const MODEL_ID = "Xenova/functiongemma-270m-game";

export type RunnerStatus = "idle" | "loading" | "ready" | "running" | "error";

/** 0-100 overall download/load progress. Only meaningful when status === "loading". */
export type LoadProgress = {
  percent: number;
  phase: "tokenizer" | "model";
  file?: string;
};

export function useFunctionGemma(drawingRef: React.RefObject<DrawingBoardHandle | null>) {
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ percent: 0, phase: "tokenizer" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tokenizerRef = useRef<unknown>(null);
  const modelRef = useRef<unknown>(null);

  const loadModel = useCallback(async () => {
    if (tokenizerRef.current && modelRef.current) {
      setStatus("ready");
      setErrorMessage(null);
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    setLoadProgress({ percent: 0, phase: "tokenizer" });
    try {
      const transformers = await import("@huggingface/transformers");
      const { AutoModelForCausalLM, AutoTokenizer, env } = transformers;

      // Use IndexedDB cache so downloads persist across sessions; next load continues from cache
      env.useCustomCache = true;
      env.customCache = await createIndexedDBCache();

      const tokenizerProgressCallback = (data: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
        if (data.status === "progress" && typeof data.progress === "number") {
          setLoadProgress((prev) => ({ ...prev, percent: Math.min(100, data.progress!), phase: "tokenizer", file: data.file }));
        }
      };
      const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
        progress_callback: tokenizerProgressCallback,
      });
      tokenizerRef.current = tokenizer;

      setLoadProgress({ percent: 0, phase: "model" });
      const modelProgressCallback = (data: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
        if (data.status === "progress" && typeof data.progress === "number") {
          setLoadProgress((prev) => ({ ...prev, percent: Math.min(100, data.progress!), phase: "model", file: data.file }));
        }
      };
      const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
        device: "webgpu",
        dtype: "q4",
        progress_callback: modelProgressCallback,
      });
      modelRef.current = model;
      setStatus("ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus("error");
      setErrorMessage(message);
    }
  }, []);

  const run = useCallback(
    async (userInput: string) => {
      const api = drawingRef.current;
      if (!api) {
        setErrorMessage("Drawing board not ready.");
        return;
      }
      if (!tokenizerRef.current || !modelRef.current) {
        await loadModel();
        if (!tokenizerRef.current || !modelRef.current) return;
      }

      setStatus("running");
      setErrorMessage(null);
      try {
        const tokenizer = tokenizerRef.current as {
          apply_chat_template: (messages: unknown[], opts: unknown) => unknown;
          decode: (ids: unknown, opts: { skip_special_tokens: boolean }) => string;
        };
        const model = modelRef.current as {
          generate: (opts: unknown) => Promise<unknown>;
        };
        const messages = [
          { role: "developer", content: SYSTEM_PROMPT },
          { role: "user", content: userInput },
        ];
        const inputs = tokenizer.apply_chat_template(messages, {
          tools: DRAW_TOOL_SCHEMA,
          tokenize: true,
          add_generation_prompt: true,
          return_dict: true,
        }) as { input_ids: { dims: number[] } };

        const output = await model.generate({
          ...inputs,
          max_new_tokens: 128,
          do_sample: false,
        });

        const decoded = tokenizer.decode(output as unknown, {
          skip_special_tokens: false,
        });

        const parsed = parseFunctionCall(decoded);
        if (!parsed) {
          setErrorMessage(
            `Could not understand command. Raw: ${decoded.slice(0, 200)}`
          );
          setStatus("ready");
          return;
        }

        const distance = parsed.args.distance ?? 20;
        switch (parsed.name) {
          case "draw_up":
            api.drawUp(distance);
            break;
          case "draw_down":
            api.drawDown(distance);
            break;
          case "draw_left":
            api.drawLeft(distance);
            break;
          case "draw_right":
            api.drawRight(distance);
            break;
        }
        setStatus("ready");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setStatus("error");
        setErrorMessage(message);
      }
    },
    [drawingRef, loadModel]
  );

  return { loadModel, run, status, loadProgress, errorMessage };
}
