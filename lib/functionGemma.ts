export const SYSTEM_PROMPT =
  "You are a model that can do function calling with the following functions";

export const DRAW_TOOL_SCHEMA = [
  {
    type: "function",
    function: {
      name: "add",
      description:
        "High level draw command. Use the direction and distance arguments to move the pen.",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            description:
              "Direction to draw: one of 'up', 'down', 'left', 'right'.",
          },
          distance: {
            type: "number",
            description:
              "Distance in pixels to move in the given direction. Default is 20.",
          },
        },
        required: ["direction"],
      },
    },
  },
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

const ESCAPE_OPEN = "<escape>";
const ESCAPE_CLOSE = "</escape>";

export type ParsedCall = {
  name: string;
  args: { distance?: number; direction?: string };
};

/**
 * Parse FunctionGemma output for a single function call.
 * Looks for `call:functionName{key:value...}` anywhere in the string.
 * String values may be wrapped in <escape>...</escape>.
 */
export function parseFunctionCall(decoded: string): ParsedCall | null {
  const callIndex = decoded.indexOf("call:");
  if (callIndex === -1) return null;

  const braceStart = decoded.indexOf("{", callIndex);
  const braceEnd = decoded.indexOf("}", braceStart);
  if (braceStart === -1 || braceEnd === -1) return null;

  const namePart = decoded
    .substring(callIndex + "call:".length, braceStart)
    .trim();

  let argsStr = decoded.substring(braceStart, braceEnd + 1);
  // Replace <escape>...</escape> with quoted string for JSON
  argsStr = argsStr.replace(
    new RegExp(`${ESCAPE_OPEN}(.*?)${ESCAPE_CLOSE}`, "gs"),
    (_, inner) => JSON.stringify(inner.trim())
  );
  // Quote unquoted keys for JSON: key: -> "key":
  argsStr = argsStr.replace(/(\w+):/g, '"$1":');

  let args: { distance?: number; direction?: string } = {};
  try {
    args = JSON.parse(argsStr) as { distance?: number; direction?: string };
  } catch {
    return { name: namePart, args: {} };
  }

  return {
    name: namePart,
    args: typeof args.distance === "number" ? { distance: args.distance } : {},
  };
}
