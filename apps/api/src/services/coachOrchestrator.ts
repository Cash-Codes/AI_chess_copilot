import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
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
${STYLE_INSTRUCTIONS[req.coachingMode]}

## Instructions
Analyze the position and give specific, practical advice for the player.
- recommendedMove must be valid algebraic notation for the current position
- alternativeMoves should be 2-3 plausible options
- summary is a single sentence capturing the core idea
- reasoning gives 2-3 concrete reasons for the recommendation
- risks lists 1-2 key watch-outs after playing this move
- confidence reflects how clear-cut the recommendation is`;
}

/**
 * Full orchestration path: context → prompt → model → shaped response.
 * Throws on model error — the route layer handles fallback.
 */
export async function orchestrateCoachResponse(
  req: CoachAnalyzeRequest,
): Promise<CoachAnalyzeResponse> {
  const context = deriveGameContext(req);
  const prompt = buildPrompt(req, context);

  const raw = await generateStructuredResponse<
    Omit<CoachAnalyzeResponse, "style">
  >(prompt, RESPONSE_SCHEMA);

  // Merge style from the request — the model doesn't need to echo it back
  return { ...raw, style: req.coachingMode };
}
