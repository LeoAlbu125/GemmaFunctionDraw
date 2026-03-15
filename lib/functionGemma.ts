export const SYSTEM_PROMPT =
  "You are a model that can do function calling with the following functions";

export const DRAW_TOOL_SCHEMA = [
  {
    type: "function",
    function: {
      name: "draw_up",
      description: "Move the pen up by a given distance (in pixels), drawing a line if the pen is down.",
      parameters: {
        type: "object",
        properties: {
          distance: {
            type: "number",
            description: "Distance in pixels to move up. Default is 20.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_down",
      description: "Move the pen down by a given distance (in pixels), drawing a line if the pen is down.",
      parameters: {
        type: "object",
        properties: {
          distance: {
            type: "number",
            description: "Distance in pixels to move down. Default is 20.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_left",
      description: "Move the pen left by a given distance (in pixels), drawing a line if the pen is down.",
      parameters: {
        type: "object",
        properties: {
          distance: {
            type: "number",
            description: "Distance in pixels to move left. Default is 20.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_right",
      description: "Move the pen right by a given distance (in pixels), drawing a line if the pen is down.",
      parameters: {
        type: "object",
        properties: {
          distance: {
            type: "number",
            description: "Distance in pixels to move right. Default is 20.",
          },
        },
        required: [],
      },
    },
  },
];

const START_TAG = "<start_function_call>";
const END_TAG = "<end_function_call>";
const ESCAPE_OPEN = "<escape>";
const ESCAPE_CLOSE = "</escape>";

export type ParsedCall = {
  name: "draw_up" | "draw_down" | "draw_left" | "draw_right";
  args: { distance?: number };
};

/**
 * Parse FunctionGemma output for a single function call.
 * Format: <start_function_call>call:functionName{key:value...}<end_function_call>
 * String values may be wrapped in <escape>...</escape>.
 */
export function parseFunctionCall(decoded: string): ParsedCall | null {
  const startIndex = decoded.indexOf(START_TAG);
  const endIndex = decoded.indexOf(END_TAG);
  if (startIndex === -1 || endIndex === -1) return null;

  let callStr = decoded.substring(
    startIndex + START_TAG.length,
    endIndex
  ).trim();

  if (!callStr.startsWith("call:")) return null;

  const braceStart = callStr.indexOf("{");
  const namePart = callStr.substring(0, braceStart).replace("call:", "").trim();
  const validNames = ["draw_up", "draw_down", "draw_left", "draw_right"];
  if (!validNames.includes(namePart)) return null;

  let argsStr = braceStart >= 0 ? callStr.substring(braceStart) : "{}";
  // Replace <escape>...</escape> with quoted string for JSON
  argsStr = argsStr.replace(
    new RegExp(`${ESCAPE_OPEN}(.*?)${ESCAPE_CLOSE}`, "gs"),
    (_, inner) => JSON.stringify(inner.trim())
  );
  // Quote unquoted keys for JSON: key: -> "key":
  argsStr = argsStr.replace(/(\w+):/g, '"$1":');

  let args: { distance?: number } = {};
  try {
    args = JSON.parse(argsStr) as { distance?: number };
  } catch {
    return { name: namePart as ParsedCall["name"], args: {} };
  }

  return {
    name: namePart as ParsedCall["name"],
    args: typeof args.distance === "number" ? { distance: args.distance } : {},
  };
}
