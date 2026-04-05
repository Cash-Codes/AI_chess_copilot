import { describe, it, expect } from "vitest";
import { buildMockResponse } from "../../services/mockCoach.js";
import type { CoachAnalyzeRequest } from "@ai-chess-copilot/shared";

const baseRequest: CoachAnalyzeRequest = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory: [],
  lastOpponentMove: "e5",
  sideToMove: "white",
  coachingMode: "balanced",
};

describe("buildMockResponse", () => {
  // --- confidence is always medium ---

  it("always sets confidence to 'medium' for balanced mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    expect(response.confidence).toBe("medium");
  });

  it("always sets confidence to 'medium' for aggressive mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "aggressive" });
    expect(response.confidence).toBe("medium");
  });

  it("always sets confidence to 'medium' for defensive mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "defensive" });
    expect(response.confidence).toBe("medium");
  });

  // --- style matches coachingMode ---

  it("sets style equal to 'balanced' when coachingMode is 'balanced'", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    expect(response.style).toBe("balanced");
  });

  it("sets style equal to 'aggressive' when coachingMode is 'aggressive'", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "aggressive" });
    expect(response.style).toBe("aggressive");
  });

  it("sets style equal to 'defensive' when coachingMode is 'defensive'", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "defensive" });
    expect(response.style).toBe("defensive");
  });

  // --- recommendedMove is mode-specific ---

  it("returns recommendedMove 'Nf3' for balanced mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    expect(response.recommendedMove).toBe("Nf3");
  });

  it("returns recommendedMove 'd4' for aggressive mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "aggressive" });
    expect(response.recommendedMove).toBe("d4");
  });

  it("returns recommendedMove 'Bc4' for defensive mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "defensive" });
    expect(response.recommendedMove).toBe("Bc4");
  });

  // --- response shape is complete ---

  it("returns a complete CoachAnalyzeResponse shape for balanced mode", () => {
    const response = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    expect(response).toHaveProperty("recommendedMove");
    expect(response).toHaveProperty("alternativeMoves");
    expect(Array.isArray(response.alternativeMoves)).toBe(true);
    expect(response).toHaveProperty("summary");
    expect(typeof response.summary).toBe("string");
    expect(response).toHaveProperty("reasoning");
    expect(Array.isArray(response.reasoning)).toBe(true);
    expect(response).toHaveProperty("risks");
    expect(Array.isArray(response.risks)).toBe(true);
    expect(response).toHaveProperty("confidence");
    expect(response).toHaveProperty("style");
  });

  it("returns non-empty reasoning array for each mode", () => {
    for (const mode of ["balanced", "aggressive", "defensive"] as const) {
      const response = buildMockResponse({ ...baseRequest, coachingMode: mode });
      expect(response.reasoning.length).toBeGreaterThan(0);
    }
  });

  it("returns non-empty risks array for each mode", () => {
    for (const mode of ["balanced", "aggressive", "defensive"] as const) {
      const response = buildMockResponse({ ...baseRequest, coachingMode: mode });
      expect(response.risks.length).toBeGreaterThan(0);
    }
  });

  // --- responses differ between modes ---

  it("returns different recommendedMoves for different modes", () => {
    const balanced = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    const aggressive = buildMockResponse({ ...baseRequest, coachingMode: "aggressive" });
    const defensive = buildMockResponse({ ...baseRequest, coachingMode: "defensive" });

    expect(balanced.recommendedMove).not.toBe(aggressive.recommendedMove);
    expect(balanced.recommendedMove).not.toBe(defensive.recommendedMove);
    expect(aggressive.recommendedMove).not.toBe(defensive.recommendedMove);
  });

  it("returns different summaries for different modes", () => {
    const balanced = buildMockResponse({ ...baseRequest, coachingMode: "balanced" });
    const aggressive = buildMockResponse({ ...baseRequest, coachingMode: "aggressive" });
    expect(balanced.summary).not.toBe(aggressive.summary);
  });
});
