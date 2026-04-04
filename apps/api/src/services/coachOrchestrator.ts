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

// Each mode has a character description and concrete per-field guidance so the
// model understands *how* to apply the style — not just that it should.
const STYLE_INSTRUCTIONS: Record<
  string,
  {
    character: string;
    moveGuidance: string;
    altGuidance: string;
    toneGuidance: string;
  }
> = {
  balanced: {
    character:
      "You are a principled coach who values solid development, central control, and long-term stability over short-term tricks.",
    moveGuidance:
      "Choose the most principled, structurally sound move. Prefer moves that develop pieces, control the center, or improve king safety over speculative sacrifices or attacks.",
    altGuidance:
      "Offer 2–3 solid alternatives that maintain good piece activity and pawn structure.",
    toneGuidance:
      "Frame reasoning around positional principles. Flag tactical risks matter-of-factly.",
  },
  aggressive: {
    character:
      "You are an attacking coach who prizes initiative, piece activity, and creating concrete threats — even at the cost of material or structural risk.",
    moveGuidance:
      "Choose the sharpest, most initiative-seizing move available. Prefer moves that open lines, create immediate threats, or launch an attack, even if they require accurate follow-up. Avoid passive consolidation.",
    altGuidance:
      "Offer 2–3 tactical alternatives — sacrifices, pawn breaks, or forcing moves — that keep the pressure on.",
    toneGuidance:
      "Frame reasoning around threats and attacking potential. In risks, flag only the most critical defensive resources the opponent might have.",
  },
  defensive: {
    character:
      "You are a safety-first coach who values avoiding blunders, reducing tactical risk, and keeping a sound position — even if it means conceding some activity.",
    moveGuidance:
      "Choose the safest, most risk-minimizing move. Prefer consolidating moves, retreats to safety, or prophylactic moves that neutralize threats over double-edged continuations.",
    altGuidance:
      "Offer 2–3 solid, low-risk alternatives that keep the position stable and hard to attack.",
    toneGuidance:
      "Frame reasoning around avoiding weaknesses and neutralizing opponent threats. In risks, be thorough — list every major watch-out.",
  },
};

function buildPrompt(req: CoachAnalyzeRequest, context: string): string {
  const style =
    STYLE_INSTRUCTIONS[req.coachingMode] ?? STYLE_INSTRUCTIONS["balanced"];
  return `${style.character}

## Current game context
${context}

## Instructions
Analyze the position and provide coaching advice that reflects the ${req.coachingMode} style throughout.

- recommendedMove: ${style.moveGuidance}
- alternativeMoves: ${style.altGuidance}
- summary: one sentence capturing the key strategic idea from a ${req.coachingMode} perspective
- reasoning: 2–3 concrete reasons for the recommendation. ${style.toneGuidance}
- risks: watch-outs after playing this move. ${style.toneGuidance}
- confidence: how clear-cut the recommendation is (low / medium / high)

recommendedMove must be valid standard algebraic notation for the current position.`;
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
