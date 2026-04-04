import type { Response } from "express";
import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  CoachStreamChunk,
} from "@ai-chess-copilot/shared";

const RESPONSES: Record<string, Pick<CoachAnalyzeResponse, "recommendedMove" | "alternativeMoves" | "summary" | "reasoning" | "risks">> = {
  balanced: {
    recommendedMove: "Nf3",
    alternativeMoves: ["Bc4", "d4"],
    summary: "Develop a knight toward the center while keeping all options open for the middlegame.",
    reasoning: [
      "Nf3 develops naturally and prepares short castling.",
      "The knight controls key squares d4 and e5.",
      "Keeps flexibility — you can follow with Bc4, d4, or e5 depending on Black's response.",
    ],
    risks: [
      "Avoid premature pawn advances before completing development.",
      "Watch for ...Bc5, which may pressure f2.",
    ],
  },
  aggressive: {
    recommendedMove: "d4",
    alternativeMoves: ["e5", "f4"],
    summary: "Strike at the center immediately to seize space and restrict Black's options.",
    reasoning: [
      "d4 claims central space and opens lines for the dark-squared bishop.",
      "Forces Black to react, keeping the initiative with White.",
    ],
    risks: [
      "Overextension is a real danger — do not push pawns without piece support.",
      "Black may counter with ...c5 or ...e5, opening sharp tactical lines.",
    ],
  },
  defensive: {
    recommendedMove: "Bc4",
    alternativeMoves: ["d3", "Nc3"],
    summary: "Develop solidly and prepare a safe position before committing to any plan.",
    reasoning: [
      "Bc4 develops a bishop to an active square without overcommitting.",
      "Maintains a flexible pawn structure and prepares castling.",
    ],
    risks: [
      "Passive play may allow Black to equalize or seize the initiative.",
      "Avoid falling into a purely reactive stance without a plan.",
    ],
  },
};

export function buildMockResponse(req: CoachAnalyzeRequest): CoachAnalyzeResponse {
  const template = RESPONSES[req.coachingMode];
  return {
    ...template,
    confidence: "medium",
    style: req.coachingMode,
  };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Section order and per-section delays (ms) control the demo pacing.
// Swap this function's body for a real LLM call when ready.
const SECTION_DELAYS: Record<CoachStreamChunk["type"], number> = {
  move: 300,
  alternatives: 250,
  confidence: 150,
  summary: 400,
  reasoning: 500,
  risks: 400,
  style: 0,
};

export async function streamMockResponse(
  req: CoachAnalyzeRequest,
  res: Response,
): Promise<void> {
  const full = buildMockResponse(req);

  const chunks: CoachStreamChunk[] = [
    { type: "move", value: full.recommendedMove },
    { type: "alternatives", value: full.alternativeMoves },
    { type: "confidence", value: full.confidence },
    { type: "summary", value: full.summary },
    { type: "reasoning", value: full.reasoning },
    { type: "risks", value: full.risks },
    { type: "style", value: full.style },
  ];

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");

  for (const chunk of chunks) {
    await delay(SECTION_DELAYS[chunk.type]);
    res.write(JSON.stringify(chunk) + "\n");
  }

  res.end();
}
