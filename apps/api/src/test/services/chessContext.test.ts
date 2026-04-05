import { describe, it, expect } from "vitest";
import { deriveGameContext } from "../../services/chessContext.js";
import type { CoachAnalyzeRequest } from "@ai-chess-copilot/shared";

const BASE: CoachAnalyzeRequest = {
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  moveHistory: ["e4"],
  lastOpponentMove: "e4",
  sideToMove: "black",
  coachingMode: "balanced",
};

describe("deriveGameContext", () => {
  it("includes the FEN in the output", () => {
    const ctx = deriveGameContext(BASE);
    expect(ctx).toContain(BASE.fen);
  });

  it("includes the side to move", () => {
    const ctx = deriveGameContext(BASE);
    expect(ctx).toContain("Playing as: black");
  });

  it("includes the coaching style", () => {
    const ctx = deriveGameContext(BASE);
    expect(ctx).toContain("Coaching style requested: balanced");
  });

  it("includes the opponent's last move when provided", () => {
    const ctx = deriveGameContext(BASE);
    expect(ctx).toContain("Opponent's last move: e4");
  });

  it("shows 'Awaiting opponent move' when lastOpponentMove is null", () => {
    const ctx = deriveGameContext({ ...BASE, lastOpponentMove: null });
    expect(ctx).toContain("Awaiting opponent move");
  });

  it("shows 'Game just started' when moveHistory is empty", () => {
    const ctx = deriveGameContext({
      ...BASE,
      moveHistory: [],
      lastOpponentMove: null,
    });
    expect(ctx).toContain("Game just started");
  });

  describe("game phase detection", () => {
    it("reports 'opening' for 0 full moves (empty history)", () => {
      const ctx = deriveGameContext({ ...BASE, moveHistory: [] });
      expect(ctx).toContain("opening");
    });

    it("reports 'opening' for 10 full moves (20 half-moves)", () => {
      const history = Array(20).fill("e4");
      const ctx = deriveGameContext({ ...BASE, moveHistory: history });
      expect(ctx).toContain("opening");
    });

    it("reports 'middlegame' for 11 full moves (22 half-moves)", () => {
      const history = Array(22).fill("e4");
      const ctx = deriveGameContext({ ...BASE, moveHistory: history });
      expect(ctx).toContain("middlegame");
    });

    it("reports 'endgame' for 26 full moves (52 half-moves)", () => {
      const history = Array(52).fill("e4");
      const ctx = deriveGameContext({ ...BASE, moveHistory: history });
      expect(ctx).toContain("endgame");
    });
  });

  it("shows only the last 6 half-moves in recent moves", () => {
    const history = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "Nf6"];
    const ctx = deriveGameContext({ ...BASE, moveHistory: history });
    // Last 6: Nf3 Nc6 Bc4 Bc5 O-O Nf6
    expect(ctx).toContain("Nf3 Nc6 Bc4 Bc5 O-O Nf6");
    // Earlier moves should not appear
    expect(ctx).not.toContain("e4 e5 Nf3");
  });

  it("includes the move count", () => {
    // 4 half-moves = 2 full moves
    const history = ["e4", "e5", "Nf3", "Nc6"];
    const ctx = deriveGameContext({ ...BASE, moveHistory: history });
    expect(ctx).toContain("move 2");
  });

  it("returns a multi-line string", () => {
    const ctx = deriveGameContext(BASE);
    expect(ctx.split("\n").length).toBeGreaterThan(3);
  });
});
