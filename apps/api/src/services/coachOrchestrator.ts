import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  Confidence,
} from "@ai-chess-copilot/shared";
import { generateStructuredResponse, SchemaType } from "./modelClient.js";
import { deriveGameContext } from "./chessContext.js";

// JSON schema for the model's structured output — mirrors CoachAnalyzeResponse
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    recommendedMove: {
      type: SchemaType.STRING,
      description: "Best move in standard algebraic notation, e.g. 'Nf3'",
    },
    alternativeMoves: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "2-3 reasonable alternative moves",
    },
    summary: {
      type: SchemaType.STRING,
      description: "One sentence capturing the key strategic idea",
    },
    reasoning: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "2-3 bullet points explaining why this move is best",
    },
    risks: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "1-2 things to watch out for after this move",
    },
    confidence: {
      type: SchemaType.STRING,
      enum: ["low", "medium", "high"],
      description: "Confidence based on position clarity",
    },
  },
  required: [
    "recommendedMove",
    "alternativeMoves",
    "summary",
    "reasoning",
    "risks",
    "confidence",
  ],
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  balanced:
    "Provide balanced, principled advice focused on solid development and strategic play.",
  aggressive:
    "Emphasize attacking moves, tactical opportunities, and initiative-seizing plays.",
  defensive:
    "Prioritize solid, safe moves that minimize risk and maintain structural integrity.",
};

function buildPrompt(req: CoachAnalyzeRequest, context: string): string {
  return `You are a chess coach analyzing a position and providing actionable coaching advice.

## Current game context
${context}

## Coaching style
${STYLE_INSTRUCTIONS[req.coachingMode] ?? STYLE_INSTRUCTIONS["balanced"]}

## Instructions
Analyze the position and give specific, practical advice for the player.
- recommendedMove must be valid algebraic notation for the current position
- alternativeMoves should be 2-3 plausible options
- summary is a single sentence capturing the core idea
- reasoning gives 2-3 concrete reasons for the recommendation
- risks lists 1-2 key watch-outs after playing this move
- confidence reflects how clear-cut the recommendation is`;
}

const CONFIDENCE_VALUES: Confidence[] = ["low", "medium", "high"];

function isValidOutput(
  raw: unknown,
): raw is Omit<CoachAnalyzeResponse, "style"> {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  const isStringArray = (arr: unknown) =>
    Array.isArray(arr) &&
    (arr as unknown[]).every((x) => typeof x === "string");
  return (
    typeof r.recommendedMove === "string" &&
    r.recommendedMove.length > 0 &&
    isStringArray(r.alternativeMoves) &&
    typeof r.summary === "string" &&
    r.summary.length > 0 &&
    isStringArray(r.reasoning) &&
    isStringArray(r.risks) &&
    CONFIDENCE_VALUES.includes(r.confidence as Confidence)
  );
}

function toSafeResponse(raw: unknown): Omit<CoachAnalyzeResponse, "style"> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const strings = (arr: unknown) =>
    Array.isArray(arr)
      ? (arr as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
  return {
    recommendedMove:
      typeof r.recommendedMove === "string" && r.recommendedMove
        ? r.recommendedMove
        : "—",
    alternativeMoves: strings(r.alternativeMoves),
    summary:
      typeof r.summary === "string" && r.summary
        ? r.summary
        : "Could not generate a suggestion for this position.",
    reasoning: strings(r.reasoning),
    risks: strings(r.risks),
    confidence: CONFIDENCE_VALUES.includes(r.confidence as Confidence)
      ? (r.confidence as Confidence)
      : "low",
  };
}

const RETRY_SUFFIX = `

IMPORTANT: Your previous response did not match the required JSON schema. \
Respond with ONLY a valid JSON object matching the schema exactly. \
Every required field must be present and correctly typed.`;

/**
 * Full orchestration path: context → prompt → model → validated response.
 *
 * If the model returns a malformed object, retries once with a stronger
 * formatting instruction. If the retry also fails, fills in safe defaults
 * via toSafeResponse so the client always gets a usable response.
 *
 * Throws on hard model/network errors — the route layer handles mock fallback.
 */
export async function orchestrateCoachResponse(
  req: CoachAnalyzeRequest,
): Promise<CoachAnalyzeResponse> {
  const context = deriveGameContext(req);
  const prompt = buildPrompt(req, context);

  const raw = await generateStructuredResponse<unknown>(
    prompt,
    RESPONSE_SCHEMA,
  );

  if (isValidOutput(raw)) {
    return { ...raw, style: req.coachingMode };
  }

  // Output was malformed — retry with a stronger formatting instruction.
  let retried: unknown = raw;
  try {
    retried = await generateStructuredResponse<unknown>(
      prompt + RETRY_SUFFIX,
      RESPONSE_SCHEMA,
    );
  } catch {
    // Retry failed — fall through to safe response using first attempt's output.
  }

  const body = isValidOutput(retried) ? retried : toSafeResponse(raw);
  return { ...body, style: req.coachingMode };
}
