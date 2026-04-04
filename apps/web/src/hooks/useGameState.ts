import { useRef, useState } from "react";
import { Chess } from "chess.js";
import type { CoachingMode, SideToMove } from "@ai-chess-copilot/shared";

export type { CoachingMode, SideToMove };

export interface GameState {
  fen: string;
  moveHistory: string[];
  sideToMove: SideToMove;
  lastOpponentMove: string | null;
  userSide: SideToMove;
}

export interface UseGameState extends GameState {
  makeMove: (from: string, to: string, promotion?: string) => boolean;
}

// V1: the local player always controls white; the opponent is black.
// Changing this constant is the only thing needed to flip sides later.
const USER_SIDE: SideToMove = "white";

function deriveState(chess: Chess): GameState {
  const history = chess.history();

  // Opponent moves sit at odd indices when the user is white:
  //   history[0] = user (white), history[1] = opponent (black), …
  // If the user were black the parity would flip (0 = opponent, 1 = user).
  const opponentParity = USER_SIDE === "white" ? 1 : 0;
  const lastOpponentMove =
    history.filter((_, i) => i % 2 === opponentParity).at(-1) ?? null;

  return {
    fen: chess.fen(),
    moveHistory: history,
    sideToMove: chess.turn() === "w" ? "white" : "black",
    lastOpponentMove,
    userSide: USER_SIDE,
  };
}

export function useGameState(): UseGameState {
  const chessRef = useRef<Chess>(new Chess());

  const [state, setState] = useState<GameState>(() => deriveState(new Chess()));

  function makeMove(from: string, to: string, promotion?: string): boolean {
    const result = chessRef.current.move({
      from,
      to,
      promotion: promotion ?? "q",
    });
    if (result === null) return false;
    setState(deriveState(chessRef.current));
    return true;
  }

  return { ...state, makeMove };
}
