import type { CoachAnalyzeRequest, CoachingMode, SideToMove } from "@ai-chess-copilot/shared";

const COACHING_MODES: CoachingMode[] = ["balanced", "aggressive", "defensive"];
const SIDES: SideToMove[] = ["white", "black"];

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; data: CoachAnalyzeRequest }
  | { ok: false; errors: ValidationError[] };

export function validateCoachRequest(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.fen !== "string" || b.fen.trim() === "") {
    errors.push({ field: "fen", message: "fen must be a non-empty string." });
  }

  if (!Array.isArray(b.moveHistory) || !b.moveHistory.every((m) => typeof m === "string")) {
    errors.push({ field: "moveHistory", message: "moveHistory must be an array of strings." });
  }

  if (typeof b.lastOpponentMove !== "string" || b.lastOpponentMove.trim() === "") {
    errors.push({ field: "lastOpponentMove", message: "lastOpponentMove must be a non-empty string." });
  }

  if (!SIDES.includes(b.sideToMove as SideToMove)) {
    errors.push({ field: "sideToMove", message: `sideToMove must be one of: ${SIDES.join(", ")}.` });
  }

  if (!COACHING_MODES.includes(b.coachingMode as CoachingMode)) {
    errors.push({ field: "coachingMode", message: `coachingMode must be one of: ${COACHING_MODES.join(", ")}.` });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      fen: (b.fen as string).trim(),
      moveHistory: b.moveHistory as string[],
      lastOpponentMove: (b.lastOpponentMove as string).trim(),
      sideToMove: b.sideToMove as SideToMove,
      coachingMode: b.coachingMode as CoachingMode,
    },
  };
}
