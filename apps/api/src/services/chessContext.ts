import type { CoachAnalyzeRequest } from "@ai-chess-copilot/shared";

/**
 * Derives a concise, human-readable game context string from the request.
 * Keeps the prompt grounded without overloading it with raw data.
 */
export function deriveGameContext(req: CoachAnalyzeRequest): string {
  const { fen, moveHistory, lastOpponentMove, sideToMove, coachingMode } = req;

  const fullMoves = Math.ceil(moveHistory.length / 2);
  const phase =
    fullMoves <= 10 ? "opening" : fullMoves <= 25 ? "middlegame" : "endgame";

  // Show the last 6 half-moves so the prompt has recent game flow without noise
  const recentMoves = moveHistory.slice(-6).join(" ");

  const lines = [
    `Position (FEN): ${fen}`,
    `Playing as: ${sideToMove}`,
    `Game phase: ${phase} (move ${fullMoves})`,
    recentMoves ? `Recent moves: ${recentMoves}` : "Game just started",
    lastOpponentMove
      ? `Opponent's last move: ${lastOpponentMove}`
      : "Awaiting opponent move",
    `Coaching style requested: ${coachingMode}`,
  ];

  return lines.join("\n");
}
