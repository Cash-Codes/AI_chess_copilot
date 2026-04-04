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

  it("propagates errors thrown by generateStructuredResponse on the first call", async () => {
    mockGenerateStructuredResponse.mockRejectedValue(
      new Error("Model unavailable"),
    );

    await expect(orchestrateCoachResponse(VALID_REQUEST)).rejects.toThrow(
      "Model unavailable",
    );
  });

  describe("output validation and retry", () => {
    it("retries when the first response is missing required fields", async () => {
      // First call returns a malformed object; second returns valid output
      mockGenerateStructuredResponse
        .mockResolvedValueOnce({ recommendedMove: "e5" }) // missing fields
        .mockResolvedValueOnce(MODEL_RESPONSE);

      const result = await orchestrateCoachResponse(VALID_REQUEST);

      expect(mockGenerateStructuredResponse).toHaveBeenCalledTimes(2);
      expect(result.recommendedMove).toBe("e5");
      expect(result.confidence).toBe("high");
    });

    it("includes RETRY_SUFFIX in the second prompt", async () => {
      mockGenerateStructuredResponse
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(MODEL_RESPONSE);

      await orchestrateCoachResponse(VALID_REQUEST);

      const [firstPrompt] = mockGenerateStructuredResponse.mock.calls[0];
      const [secondPrompt] = mockGenerateStructuredResponse.mock.calls[1];
      expect(secondPrompt).toContain(firstPrompt as string);
      expect(secondPrompt).toContain("IMPORTANT");
    });

    it("returns a safe fallback when both calls return malformed output", async () => {
      mockGenerateStructuredResponse
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await orchestrateCoachResponse(VALID_REQUEST);

      expect(result.recommendedMove).toBe("—");
      expect(result.confidence).toBe("low");
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.style).toBe("balanced");
    });

    it("returns safe fallback when retry throws", async () => {
      mockGenerateStructuredResponse
        .mockResolvedValueOnce({ recommendedMove: "Nf3" }) // malformed (missing fields)
        .mockRejectedValueOnce(new Error("timeout"));

      const result = await orchestrateCoachResponse(VALID_REQUEST);

      // Should not throw — should return a safe partial response
      expect(result.recommendedMove).toBe("Nf3"); // preserved from first call
      expect(result.confidence).toBe("low"); // defaulted
      expect(result.style).toBe("balanced");
    });

    it("does not retry when the first response is valid", async () => {
      mockGenerateStructuredResponse.mockResolvedValueOnce(MODEL_RESPONSE);

      await orchestrateCoachResponse(VALID_REQUEST);

      expect(mockGenerateStructuredResponse).toHaveBeenCalledTimes(1);
    });

    it("preserves valid array fields in safe fallback", async () => {
      const partial = {
        reasoning: ["Central control is key."],
        risks: ["White can play d4."],
      };
      mockGenerateStructuredResponse
        .mockResolvedValueOnce(partial)
        .mockResolvedValueOnce(partial);

      const result = await orchestrateCoachResponse(VALID_REQUEST);

      expect(result.reasoning).toEqual(["Central control is key."]);
      expect(result.risks).toEqual(["White can play d4."]);
    });
  });
});
