# Drawing Board — FunctionGemma

Next.js frontend with a local drawing board. Natural language is turned into draw commands (up/down/left/right) by **FunctionGemma 270M** running in the browser via Transformers.js. No backend; everything runs locally.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first time you use the app, the model will download (~200MB) and cache in the browser.

## Usage

Type a command in the input and press **Draw**, e.g.:

- "draw up"
- "go right 50"
- "draw left"
- "draw down 30"

The model runs entirely in the browser (WebGPU or WASM). If WebGPU is unavailable, inference may be slower.

## Project structure

- `app/page.tsx` — Renders the client-only drawing UI.
- `app/components/DrawingBoard.tsx` — Canvas, pen state, and `draw_up` / `draw_down` / `draw_left` / `draw_right` / `clear`.
- `app/components/FunctionGemmaRunner.tsx` — `useFunctionGemma` hook: loads tokenizer/model, runs inference, parses function calls, calls drawing API.
- `app/components/DrawingBoardWithAI.tsx` — Combines board + runner + text input and status.
- `lib/functionGemma.ts` — Tool schema, system prompt, and function-call parser.

## Model

Uses `Xenova/functiongemma-270m-game` from Hugging Face (Transformers.js–compatible). You may need to accept the Gemma license on Hugging Face for access.
