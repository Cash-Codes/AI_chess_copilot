import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoachAnalyzeRequest } from "@ai-chess-copilot/shared";

// Mock modelClient so no real network calls are made
vi.mock("../../services/modelClient.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/modelClient.js")>();
  return {
    ...actual,
    generateStructuredResponse: vi.fn(),
  };
});

import { generateStructuredResponse } from "../../services/modelClient.js";
import { orchestrateCoachResponse } from "../../services/coachOrchestrator.js";

const mockGenerateStructuredResponse = vi.mocked(generateStructuredResponse);

const VALID_REQUEST: CoachAnalyzeRequest = {
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  moveHistory: ["e4"],
  lastOpponentMove: "e4",
  sideToMove: "black",
  coachingMode: "balanced",
};

const MODEL_RESPONSE = {
  recommendedMove: "e5",
  alternativeMoves: ["c5", "Nf6"],
  summary: "Respond symmetrically to claim central space.",
  reasoning: ["e5 mirrors White's pawn and contests the center directly."],
  risks: ["Allows White to play d4, opening the center."],
  confidence: "high" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orchestrateCoachResponse", () => {
  it("returns a CoachAnalyzeResponse with the model's output merged with style", async () => {
    mockGenerateStructuredResponse.mockResolvedValue(MODEL_RESPONSE);

    const result = await orchestrateCoachResponse(VALID_REQUEST);

    expect(result.recommendedMove).toBe("e5");
    expect(result.alternativeMoves).toEqual(["c5", "Nf6"]);
    expect(result.summary).toBe(
      "Respond symmetrically to claim central space.",
    );
    expect(result.confidence).toBe("high");
    expect(result.style).toBe("balanced"); // merged from req, not from model
  });

  it("sets style from the request coachingMode, not from the model response", async () => {
    mockGenerateStructuredResponse.mockResolvedValue(MODEL_RESPONSE);

    const aggressive = {
      ...VALID_REQUEST,
      coachingMode: "aggressive" as const,
    };
    const result = await orchestrateCoachResponse(aggressive);

    expect(result.style).toBe("aggressive");
  });

  it("calls generateStructuredResponse with a prompt and a schema", async () => {
    mockGenerateStructuredResponse.mockResolvedValue(MODEL_RESPONSE);

    await orchestrateCoachResponse(VALID_REQUEST);

    expect(mockGenerateStructuredResponse).toHaveBeenCalledOnce();
    const [prompt, schema] = mockGenerateStructuredResponse.mock.calls[0];
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
    expect(schema).toBeDefined();
  });

  it("includes the FEN in the prompt passed to the model", async () => {
    mockGenerateStructuredResponse.mockResolvedValue(MODEL_RESPONSE);

    await orchestrateCoachResponse(VALID_REQUEST);

    const prompt = mockGenerateStructuredResponse.mock.calls[0][0] as string;
    expect(prompt).toContain(VALID_REQUEST.fen);
  });

  it("includes coaching mode style instructions in the prompt", async () => {
    mockGenerateStructuredResponse.mockResolvedValue(MODEL_RESPONSE);

    await orchestrateCoachResponse({
      ...VALID_REQUEST,
      coachingMode: "aggressive",
    });

    const prompt = mockGenerateStructuredResponse.mock.calls[0][0] as string;
    expect(prompt.toLowerCase()).toContain("attack");
  });

  it("propagates errors thrown by generateStructuredResponse", async () => {
    mockGenerateStructuredResponse.mockRejectedValue(
      new Error("Model unavailable"),
    );

    await expect(orchestrateCoachResponse(VALID_REQUEST)).rejects.toThrow(
      "Model unavailable",
    );
  });
});
