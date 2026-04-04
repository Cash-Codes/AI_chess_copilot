export type CoachingMode = "balanced" | "aggressive" | "defensive";

export type SideToMove = "white" | "black";

export type Confidence = "low" | "medium" | "high";

export interface CoachAnalyzeRequest {
  fen: string;
  moveHistory: string[];
  lastOpponentMove: string | null;
  sideToMove: SideToMove;
  coachingMode: CoachingMode;
}

export type CoachStreamChunk =
  | { type: "move"; value: string }
  | { type: "alternatives"; value: string[] }
  | { type: "confidence"; value: Confidence }
  | { type: "summary"; value: string }
  | { type: "reasoning"; value: string[] }
  | { type: "risks"; value: string[] }
  | { type: "style"; value: CoachingMode };

export interface CoachAnalyzeResponse {
  recommendedMove: string;
  alternativeMoves: string[];
  summary: string;
  reasoning: string[];
  risks: string[];
  confidence: Confidence;
  style: CoachingMode;
}
