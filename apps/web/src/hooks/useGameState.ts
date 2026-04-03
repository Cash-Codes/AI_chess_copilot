import { useRef, useState } from "react";
import { Chess } from "chess.js";
import type { CoachingMode, SideToMove } from "@ai-chess-copilot/shared";

export type { CoachingMode, SideToMove };

export interface GameState {
  fen: string;
  moveHistory: string[];
  sideToMove: SideToMove;
  lastOpponentMove: string | null;
}

export interface UseGameState extends GameState {
  makeMove: (from: string, to: string, promotion?: string) => boolean;
}

function deriveState(chess: Chess): GameState {
  const history = chess.history();
  return {
    fen: chess.fen(),
    moveHistory: history,
    sideToMove: chess.turn() === "w" ? "white" : "black",
    lastOpponentMove: history.length > 0 ? history[history.length - 1] : null,
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
