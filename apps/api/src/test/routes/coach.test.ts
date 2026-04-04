import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import type {
  CoachStreamChunk,
  CoachAnalyzeResponse,
} from "@ai-chess-copilot/shared";

// We mock at the module level so we can swap real-model vs mock behaviour per test.
vi.mock("../../services/modelClient.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/modelClient.js")>();
  return { ...actual, getVertexConfig: vi.fn() };
});

vi.mock("../../services/coachOrchestrator.js", () => ({
  orchestrateCoachResponse: vi.fn(),
}));

import { getVertexConfig } from "../../services/modelClient.js";
import { orchestrateCoachResponse } from "../../services/coachOrchestrator.js";

const mockGetVertexConfig = vi.mocked(getVertexConfig);
const mockOrchestrateCoachResponse = vi.mocked(orchestrateCoachResponse);

const MOCK_VERTEX_CONFIG = {
  project: "test-project",
  location: "us-central1",
  model: "gemini-2.0-flash-001",
};

const MODEL_RESPONSE: CoachAnalyzeResponse = {
  recommendedMove: "Nf3",
  alternativeMoves: ["d4", "Bc4"],
  summary: "Develop the knight to a natural square.",
  reasoning: ["Controls central squares.", "Prepares castling."],
  risks: ["Black may play ...d5."],
  confidence: "high",
  style: "balanced",
};

const validBody = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory: ["e4", "e5"],
  lastOpponentMove: "e5",
  sideToMove: "white",
  coachingMode: "balanced",
};

/** Parse a raw NDJSON response body into an array of CoachStreamChunk objects. */
function parseNdjson(text: string): CoachStreamChunk[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as CoachStreamChunk);
}

/** Assemble an array of CoachStreamChunk objects into a record keyed by type. */
function assembleChunks(chunks: CoachStreamChunk[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of chunks) out[c.type] = c.value;
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no vertex config → use mock
  mockGetVertexConfig.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/coach/analyze — real model path", () => {
  beforeEach(() => {
    mockGetVertexConfig.mockReturnValue(MOCK_VERTEX_CONFIG);
    mockOrchestrateCoachResponse.mockResolvedValue(MODEL_RESPONSE);
  });

  it("returns 200 NDJSON when orchestrator succeeds", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/x-ndjson/);
  });

  it("streams the orchestrator response as NDJSON chunks", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    const assembled = assembleChunks(parseNdjson(res.text));
    expect(assembled.move).toBe("Nf3");
    expect(assembled.confidence).toBe("high");
    expect(assembled.style).toBe("balanced");
  });

  it("calls orchestrateCoachResponse with the validated request data", async () => {
    await request(app).post("/api/coach/analyze").send(validBody);
    expect(mockOrchestrateCoachResponse).toHaveBeenCalledOnce();
    const call = mockOrchestrateCoachResponse.mock.calls[0][0];
    expect(call.fen).toBe(validBody.fen);
    expect(call.coachingMode).toBe("balanced");
  });

  it("returns 503 when orchestrator throws", async () => {
    mockOrchestrateCoachResponse.mockRejectedValue(new Error("Model timeout"));
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    expect(res.status).toBe(503);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("POST /api/coach/analyze", () => {
  // --- 200 NDJSON streaming success cases (mock path, no vertex config) ---

  it("returns 200 with content-type application/x-ndjson for a valid body", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/x-ndjson/);
  });

  it("returns all 7 expected section types in the stream", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    const chunks = parseNdjson(res.text);
    const types = chunks.map((c) => c.type);
    expect(types).toContain("move");
    expect(types).toContain("alternatives");
    expect(types).toContain("confidence");
    expect(types).toContain("summary");
    expect(types).toContain("reasoning");
    expect(types).toContain("risks");
    expect(types).toContain("style");
  });

  it("emits sections in the expected order", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    const types = parseNdjson(res.text).map((c) => c.type);
    expect(types).toEqual([
      "move",
      "alternatives",
      "confidence",
      "summary",
      "reasoning",
      "risks",
      "style",
    ]);
  });

  it("assembled chunks match full CoachAnalyzeResponse shape for balanced mode", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);
    const assembled = assembleChunks(parseNdjson(res.text));

    expect(typeof assembled.move).toBe("string");
    expect(Array.isArray(assembled.alternatives)).toBe(true);
    expect(assembled.confidence).toBe("medium");
    expect(typeof assembled.summary).toBe("string");
    expect(Array.isArray(assembled.reasoning)).toBe(true);
    expect(Array.isArray(assembled.risks)).toBe(true);
    expect(assembled.style).toBe("balanced");
  });

  it("returns recommendedMove 'd4' for aggressive mode", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "aggressive" });
    const assembled = assembleChunks(parseNdjson(res.text));
    expect(assembled.move).toBe("d4");
    expect(assembled.style).toBe("aggressive");
  });

  it("returns recommendedMove 'Bc4' for defensive mode", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "defensive" });
    const assembled = assembleChunks(parseNdjson(res.text));
    expect(assembled.move).toBe("Bc4");
    expect(assembled.style).toBe("defensive");
  });

  it("returns 200 when sideToMove is 'black'", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, sideToMove: "black" });
    expect(res.status).toBe(200);
  });

  it("returns 200 when moveHistory is an empty array", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, moveHistory: [] });
    expect(res.status).toBe(200);
  });

  it("returns 200 when lastOpponentMove is missing (treated as null)", async () => {
    const body = Object.fromEntries(
      Object.entries(validBody).filter(([k]) => k !== "lastOpponentMove"),
    );
    const res = await request(app).post("/api/coach/analyze").send(body);
    expect(res.status).toBe(200);
  });

  // --- 400 validation failure cases (still plain JSON, unchanged) ---

  it("returns 400 with error and details when body is empty", async () => {
    const res = await request(app).post("/api/coach/analyze").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("returns 400 when fen is missing, with 'fen' in details", async () => {
    const body = Object.fromEntries(
      Object.entries(validBody).filter(([k]) => k !== "fen"),
    );
    const res = await request(app).post("/api/coach/analyze").send(body);
    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map(
      (e: { field: string }) => e.field,
    );
    expect(fields).toContain("fen");
  });

  it("returns 400 when fen is an empty string", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, fen: "" });
    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map(
      (e: { field: string }) => e.field,
    );
    expect(fields).toContain("fen");
  });

  it("returns 400 when moveHistory is not an array", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, moveHistory: "e4 e5" });
    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map(
      (e: { field: string }) => e.field,
    );
    expect(fields).toContain("moveHistory");
  });

  it("returns 400 when sideToMove is an invalid enum value", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, sideToMove: "purple" });
    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map(
      (e: { field: string }) => e.field,
    );
    expect(fields).toContain("sideToMove");
  });

  it("returns 400 when coachingMode is an invalid enum value", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "chaotic" });
    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map(
      (e: { field: string }) => e.field,
    );
    expect(fields).toContain("coachingMode");
  });

  it("returns 400 for plain text content type", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .set("Content-Type", "text/plain")
      .send("not json");
    expect(res.status).toBe(400);
  });

  it("includes both 'error' string and 'details' array in 400 responses", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "unknown" });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
